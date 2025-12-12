// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

declare const Deno: any;

// Security: Restrict CORS to specific origins
const getAllowedOrigin = (origin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('SITE_URL') || '',
    // ... (rest of getAllowedOrigin stays same, but I can't put `...` in replace_file_content for multiple line replacement so I will use a StartLine/EndLine strategy that covers file header and start of next function)

    // Actually I will do it in chunks to avoid large replacements.

    // Chunk 1: Header + Deno declaration
    // Chunk 2: serve(req: Request)
    // Chunk 3: cookie types
    'http://localhost:3000',
    'http://localhost:5173',
    'https://lovable.dev',
    'https://lqhvsafeatkgaxxvyeje.supabase.co'
  ].filter(Boolean);

  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return origin;
  }

  // Strict Secure Default: Do not allow random origins.
  // We return the primary site URL if origin matches nothing, or null string which is invalid for browsers but safer than *
  return allowedOrigins[0] || '';
};

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(origin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify user authentication
    let authHeader = req.headers.get('authorization') || '';
    if (!authHeader) {
      const cookies = req.headers.get('cookie') || '';
      const match = cookies.split(';').map((s: string) => s.trim()).find((c: string) => c.startsWith('sb_jwt='));
      const token = match ? match.split('=')[1] : null;
      if (token) authHeader = `Bearer ${token}`;
    }
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client and verify the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed');
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: requestCount, error: countError } = await supabaseClient
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('endpoint', 'razorpay-create-order')
      .gte('created_at', windowStart);

    if (!countError && requestCount !== null && requestCount >= MAX_REQUESTS_PER_WINDOW) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this request for rate limiting
    await supabaseClient
      .from('rate_limits')
      .insert({ user_id: user.id, endpoint: 'razorpay-create-order' });

    const { orderId, currency = "INR", notes } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing order ID" }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order from database to get the trusted amount
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, total_amount, status')
      .eq('id', orderId)
      .eq('user_id', user.id) // Ensure order belongs to user
      .single();

    if (orderError || !orderData) {
      console.error('Order fetching error:', orderError);
      return new Response(
        JSON.stringify({ error: "Order not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount (total_amount is typically in Rupees, Razorpay expects paise)
    const amount = Math.round(Number(orderData.total_amount) * 100);

    if (isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid order amount" }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials not configured');
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create idempotency key to prevent duplicate orders
    const idempotencyKey = `order_${user.id}_${orderId}`;

    // Create Razorpay order
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'X-Razorpay-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        amount: amount,
        currency,
        receipt: orderId, // Use database Order ID as receipt
        notes: {
          ...notes,
          order_id: orderId, // Critical: Link Razorpay Order to DB Order ID for verification
          user_id: user.id
        }
      })
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json();
      console.error('Razorpay API error:', JSON.stringify(errorData));
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: razorpayResponse.status, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayOrderData = await razorpayResponse.json();
    console.log('Razorpay order created:', razorpayOrderData.id, 'for user:', user.id);

    return new Response(
      JSON.stringify({
        orderId: razorpayOrderData.id,
        amount: razorpayOrderData.amount,
        currency: razorpayOrderData.currency,
        receipt: razorpayOrderData.receipt,
        // Return dbOrderId so client knows usage (redundant but helpful)
        dbOrderId: orderData.id
      }),
      { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in razorpay-create-order:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );
  }
});