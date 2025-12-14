import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

declare const Deno: any;

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && (
    origin.includes('localhost') ||
    origin.includes('handloombykrishnkunj') ||
    origin.includes('lovable') ||
    origin.includes('supabase')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

serve(async (req: any) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const xsrfHeader = req.headers.get('x-csrf-token');
    const xsrfCookie = (() => {
      const cookies = req.headers.get('cookie') || '';
      const match = cookies.split(';').map((s: string) => s.trim()).find((c: string) => c.startsWith('XSRF-TOKEN='));
      return match ? match.split('=')[1] : null;
    })();
    // if (!xsrfHeader || !xsrfCookie || xsrfHeader !== xsrfCookie) return new Response(JSON.stringify({ error: 'CSRF token missing or invalid' }), { status: 403, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

    // Rate-limit by IP
    try {
      const { globalRateLimiter } = await import('../utils/rate-limit.ts');
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const rate = globalRateLimiter.check(ip);
      if (!rate.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.warn('Rate limiter unavailable', e instanceof Error ? e.message : e);
    }

    let authHeader = req.headers.get('authorization') || '';
    if (!authHeader) {
      const cookies = req.headers.get('cookie') || '';
      const match = cookies.split(';').map((s: string) => s.trim()).find((c: string) => c.startsWith('sb_jwt='));
      const token = match ? match.split('=')[1] : null;
      if (token) authHeader = `Bearer ${token}`;
    }
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify user and role via anon client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role for admin check and updates
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user has admin role
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (roleError || !roleData) {
      // Allow fallback if needed for debugging, but for now enforce
      return new Response(JSON.stringify({ error: 'Forbidden - Admins only' }), { status: 403, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    const reqBody = await req.json();
    const { orderId, status } = reqBody;

    if (!orderId || !status) {
      return new Response(JSON.stringify({ error: 'orderId and status required' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate status values
    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }



    // Verify order exists
    const { data: orderData, error: orderError } = await adminClient
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Update order status
    const { error: updateError } = await adminClient
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError.message);
      return new Response(JSON.stringify({ error: 'Failed to update order' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Optional: Insert audit log into admin_audit_logs table if present
    try {
      const auditRes = await adminClient.from('admin_audit_logs').insert({
        user_id: user.id,
        action: 'update_order_status',
        resource_id: orderId,
        resource_type: 'order',
        details: { previous_status: orderData.status, new_status: status },
        created_at: new Date().toISOString()
      });
      if (auditRes.error) console.warn('Audit log insertion failed', auditRes.error.message);
    } catch (e) {
      // ignore audit failures
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in admin-update-order-status:', error instanceof Error ? error.message : 'Unknown');
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
  }
});
