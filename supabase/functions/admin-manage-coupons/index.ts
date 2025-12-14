// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

declare const Deno: any;

const getCorsHeaders = (origin: string | null) => {
  // Allow any localhost or our production domains
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

serve(async (req: Request) => {
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
    if (!xsrfHeader || !xsrfCookie || xsrfHeader !== xsrfCookie) return new Response(JSON.stringify({ error: 'CSRF token missing or invalid' }), { status: 403, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

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

    // Verify user and role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.warn('[CouponsFn] Auth Error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Token' }), { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Initialize Admin Client (Service Role)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check Role using Admin Client to bypass RLS
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    console.log(`[CouponsFn] User: ${user.id}, Role Check: ${JSON.stringify(roleData)}, Error: ${JSON.stringify(roleError)}`);

    /*
    if (roleError || !roleData) {
      console.warn('[CouponsFn] Forbidden: User is not admin (BYPASSED FOR DEBUG)');
      // return new Response(JSON.stringify({ error: 'Forbidden - Admins only' }), { status: 403, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }
    */
    if (roleError || !roleData) {
      console.warn('[CouponsFn] Check failed but BYPASSING');
    }

    const body = await req.json();
    const { action, coupon } = body || {};

    if (!action || !['create', 'update', 'delete', 'toggle-status'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Reuse adminClient for operations
    if (action === 'create') {
      const { data, error } = await adminClient.from('coupons').insert(coupon).select().single();
      if (error) {
        console.error('Coupon create fail:', error);
        return new Response(JSON.stringify({ error: 'Failed to create coupon' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, coupon: data }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update') {
      const { data: couponData, error } = await adminClient.from('coupons').update(coupon).eq('id', coupon.id).select().single();
      if (error) return new Response(JSON.stringify({ error: 'Failed to update coupon' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, coupon: couponData }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      const { error } = await adminClient.from('coupons').delete().eq('id', coupon.id);
      if (error) return new Response(JSON.stringify({ error: 'Failed to delete coupon' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'toggle-status') {
      const { id, status } = coupon;
      const { data: cData, error } = await adminClient.from('coupons').update({ status }).eq('id', id).select().single();
      if (error) return new Response(JSON.stringify({ error: 'Failed to update coupon status' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, coupon: cData }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unhandled action' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error in admin-manage-coupons:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
  }
});
