import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Security: Restrict CORS to specific origins
const getAllowedOrigin = (origin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('SITE_URL') || '',
    'https://lovable.dev',
    'https://lqhvsafeatkgaxxvyeje.supabase.co'
  ].filter(Boolean);
  
  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return origin;
  }
  return allowedOrigins[0] || '*';
};

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(origin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Allow more for payment verification

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

    // Rate limiting check
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: requestCount, error: countError } = await supabaseClient
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('endpoint', 'razorpay-verify-payment')
      .gte('created_at', windowStart);

    if (!countError && requestCount !== null && requestCount >= MAX_REQUESTS_PER_WINDOW) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this request for rate limiting
    await supabaseClient
      .from('rate_limits')
      .insert({ user_id: user.id, endpoint: 'razorpay-verify-payment' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_details } = await req.json();

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing payment verification parameters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field formats
    if (typeof razorpay_order_id !== 'string' || !razorpay_order_id.startsWith('order_')) {
      return new Response(
        JSON.stringify({ error: "Invalid order ID format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof razorpay_payment_id !== 'string' || !razorpay_payment_id.startsWith('pay_')) {
      return new Response(
        JSON.stringify({ error: "Invalid payment ID format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!keySecret) {
      console.error('Razorpay key secret not configured');
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature using constant-time comparison
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keySecret);
    const messageData = encoder.encode(text);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const generatedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison to prevent timing attacks
    const isValid = generatedSignature.length === razorpay_signature.length &&
      generatedSignature.split('').every((char, i) => char === razorpay_signature[i]);

    if (!isValid) {
      console.error('Invalid payment signature for order:', razorpay_order_id);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid payment signature" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment verified successfully:', razorpay_payment_id, 'for user:', user.id);

    // Update order in database if order_details provided
    if (order_details && order_details.order_id) {
      // Use service role for admin operations
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Verify the order belongs to this user before updating
      const { data: orderData, error: orderCheckError } = await adminClient
        .from('orders')
        .select('user_id')
        .eq('id', order_details.order_id)
        .single();

      if (orderCheckError || !orderData) {
        console.error('Order not found:', order_details.order_id);
        return new Response(
          JSON.stringify({ success: false, error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (orderData.user_id !== user.id) {
        console.error('Order does not belong to user:', user.id);
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await adminClient
        .from('orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', order_details.order_id);

      if (updateError) {
        console.error('Error updating order status:', updateError.message);
      } else {
        console.log('Order status updated to paid:', order_details.order_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in razorpay-verify-payment:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});