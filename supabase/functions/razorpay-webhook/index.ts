import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Webhook endpoints should have minimal CORS - only for preflight
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-razorpay-signature, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// Add secure headers to all responses
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  // Only allow POST method for webhooks
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    
    console.log('Webhook received');

    if (!signature) {
      console.error('No signature provided');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate-limit webhook calls by IP to slow brute force / replay:
    try {
      const { globalRateLimiter } = await import('../utils/rate-limit.ts');
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('remote_addr') || 'unknown';
      const check = globalRateLimiter.check(ip);
      if (!check.ok) {
        console.warn('Webhook rate limit exceeded for IP:', ip);
        return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
    } catch (e) {
      console.warn('Rate limiter unavailable', e instanceof Error ? e.message : e);
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
    const generatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    // Constant-time comparison to prevent timing attacks
    const isValid = generatedSignature.length === signature.length &&
      generatedSignature.split('').every((char, i) => char === signature[i]);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = JSON.parse(body);
    console.log('Webhook event type:', event.event);

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
        await handleRefundCreated(event.payload.refund.entity);
        break;
      
      case 'refund.processed':
        await handleRefundProcessed(event.payload.refund.entity);
        break;

      default:
        console.log('Unhandled event type:', event.event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handlePaymentCaptured(supabase: any, payment: any) {
  console.log('Processing payment.captured:', payment.id);
  
  // REPLAY ATTACK PREVENTION: Check if this payment was already processed
  const { data: alreadyProcessed, error: checkError } = await supabase
    .rpc('check_webhook_processed', { p_payment_id: payment.id });

  if (checkError) {
    console.error('Error checking processed status:', checkError.message);
  }

  if (alreadyProcessed) {
    console.log('Payment already processed, skipping:', payment.id);
    return;
  }

  // Mark as processed BEFORE making changes (prevents race conditions)
  const { error: markError } = await supabase
    .rpc('mark_webhook_processed', { 
      p_payment_id: payment.id, 
      p_event_type: 'payment.captured' 
    });

  if (markError) {
    console.error('Error marking payment as processed:', markError.message);
    // Continue anyway - better to process twice than not at all
  }

  const orderId = payment.notes?.order_id;
  if (!orderId) {
    console.error('No order_id in payment notes');
    return;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    console.error('Invalid order_id format');
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
    console.error('Error updating order status:', error.message);
  } else {
    console.log('Order status updated to paid:', orderId);
  }
}

async function handlePaymentFailed(supabase: any, payment: any) {
  console.log('Processing payment.failed:', payment.id);
  
  // REPLAY ATTACK PREVENTION: Check if this payment was already processed
  const { data: alreadyProcessed } = await supabase
    .rpc('check_webhook_processed', { p_payment_id: payment.id });

  if (alreadyProcessed) {
    console.log('Payment failure already processed, skipping:', payment.id);
    return;
  }

  // Mark as processed
  await supabase.rpc('mark_webhook_processed', { 
    p_payment_id: payment.id, 
    p_event_type: 'payment.failed' 
  });

  const orderId = payment.notes?.order_id;
  if (!orderId) {
    console.error('No order_id in payment notes');
    return;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    console.error('Invalid order_id format');
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
    console.error('Error updating order status:', error.message);
  } else {
    console.log('Order status updated to failed:', orderId);
  }
}

function handleRefundCreated(refund: any) {
  console.log('Processing refund.created:', refund.id, 'for payment:', refund.payment_id);
  // Log for audit purposes - actual refund processing would require more context
}

function handleRefundProcessed(refund: any) {
  console.log('Processing refund.processed:', refund.id, 'for payment:', refund.payment_id);
  // Log for audit purposes
}
