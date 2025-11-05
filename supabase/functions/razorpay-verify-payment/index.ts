import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_details } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing payment verification parameters" }),
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

    // Verify signature
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

    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      console.error('Invalid payment signature');
      return new Response(
        JSON.stringify({ success: false, error: "Invalid payment signature" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment verified successfully:', razorpay_payment_id);

    // Update order in database if order_details provided
    if (order_details && order_details.order_id) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', order_details.order_id);

      if (updateError) {
        console.error('Error updating order status:', updateError);
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
    console.error('Error in razorpay-verify-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
