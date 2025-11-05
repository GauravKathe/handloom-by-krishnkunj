import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    
    console.log('Webhook received:', { signature: !!signature });

    if (!signature) {
      console.error('No signature provided');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (generatedSignature !== signature) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = JSON.parse(body);
    console.log('Webhook event:', event.event);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(supabaseClient, event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(supabaseClient, event.payload.payment.entity);
        break;
      
      case 'refund.created':
        await handleRefundCreated(supabaseClient, event.payload.refund.entity);
        break;
      
      case 'refund.processed':
        await handleRefundProcessed(supabaseClient, event.payload.refund.entity);
        break;

      default:
        console.log('Unhandled event type:', event.event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handlePaymentCaptured(supabase: any, payment: any) {
  console.log('Processing payment.captured:', payment.id);
  
  const orderId = payment.notes?.order_id;
  if (!orderId) {
    console.error('No order_id in payment notes');
    return;
  }

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
  } else {
    console.log('Order status updated to paid:', orderId);
  }
}

async function handlePaymentFailed(supabase: any, payment: any) {
  console.log('Processing payment.failed:', payment.id);
  
  const orderId = payment.notes?.order_id;
  if (!orderId) {
    console.error('No order_id in payment notes');
    return;
  }

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
  } else {
    console.log('Order status updated to failed:', orderId);
  }
}

async function handleRefundCreated(supabase: any, refund: any) {
  console.log('Processing refund.created:', refund.id);
  
  const paymentId = refund.payment_id;
  
  // Find order by checking notes in related payment
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .limit(100);

  // In a real scenario, you'd store payment_id in orders table for easy lookup
  console.log('Refund created for payment:', paymentId);
}

async function handleRefundProcessed(supabase: any, refund: any) {
  console.log('Processing refund.processed:', refund.id);
  
  const paymentId = refund.payment_id;
  
  // Update order status to refunded
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .limit(100);

  console.log('Refund processed for payment:', paymentId);
}
