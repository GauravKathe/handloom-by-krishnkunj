import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Security: Restrict CORS to specific origins
const getAllowedOrigin = (origin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('SITE_URL') || '',
    'https://lovable.dev',
    'https://lqhvsafeatkgaxxvyeje.supabase.co'
  ].filter(Boolean);
  
  // In production, validate against allowed origins
  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return origin;
  }
  // Default to site URL or first allowed origin
  return allowedOrigins[0] || '*';
};

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(origin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

serve(async (req) => {
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
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, currency = "INR", receipt, notes } = await req.json();

    // Validate amount - must be positive integer (paise)
    if (!amount || typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
      return new Response(
        JSON.stringify({ error: "Invalid amount - must be a positive integer in paise" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount range (min 100 paise = ₹1, max reasonable limit)
    if (amount < 100 || amount > 1000000000) {
      return new Response(
        JSON.stringify({ error: "Amount out of valid range" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials not configured');
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create idempotency key to prevent duplicate orders
    const idempotencyKey = `order_${user.id}_${receipt || Date.now()}`;

    // Create Razorpay order
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'X-Razorpay-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes: {
          ...notes,
          user_id: user.id // Always include user_id for audit
        }
      })
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json();
      console.error('Razorpay API error:', JSON.stringify(errorData));
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: razorpayResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData = await razorpayResponse.json();
    console.log('Razorpay order created:', orderData.id, 'for user:', user.id);

    return new Response(
      JSON.stringify({
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in razorpay-create-order:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
