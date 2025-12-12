import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const getAllowedOrigin = (origin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('SITE_URL') || '',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://lovable.dev',
    'https://lqhvsafeatkgaxxvyeje.supabase.co'
  ].filter(Boolean);

  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return origin;
  }
  return allowedOrigins[0] || '';
};

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(origin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

  try {
    const xsrfHeader = req.headers.get('x-csrf-token');
    const xsrfCookie = (() => {
      const cookies = req.headers.get('cookie') || '';
      const match = cookies.split(';').map(s => s.trim()).find(c => c.startsWith('XSRF-TOKEN='));
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
      const match = cookies.split(';').map(s => s.trim()).find(c => c.startsWith('sb_jwt='));
      const token = match ? match.split('=')[1] : null;
      if (token) authHeader = `Bearer ${token}`;
    }
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

    // Admin check
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (roleError || !roleData) return new Response(JSON.stringify({ error: 'Forbidden - Admins only' }), { status: 403, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

    const body: unknown = await req.json();
    const parsedBody = (body && typeof body === 'object') ? body as Record<string, any> : {};
    const { action, review } = parsedBody || {};
    if (!action || !['create', 'update', 'delete'].includes(action)) return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'create') {
      // validate minimal review fields
      if (!review || !review.product_id || !review.user_id || typeof review.rating !== 'number') {
        return new Response(JSON.stringify({ error: 'Invalid review payload' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
      const { data, error } = await adminClient.from('reviews').insert(review).select().single();
      if (error) return new Response(JSON.stringify({ error: 'Failed to create review' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'create_review', resource_id: data.id, resource_type: 'review', details: review, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true, review: data }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update') {
      if (!review || !review.id) {
        return new Response(JSON.stringify({ error: 'Invalid review id for update' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: reviewData, error } = await adminClient.from('reviews').update(review).eq('id', review.id).select().single();
      if (error) return new Response(JSON.stringify({ error: 'Failed to update review' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'update_review', resource_id: review.id, resource_type: 'review', details: review, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true, review: reviewData }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      if (!review || !review.id) {
        return new Response(JSON.stringify({ error: 'Invalid review id for delete' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
      const { error } = await adminClient.from('reviews').delete().eq('id', review.id);
      if (error) return new Response(JSON.stringify({ error: 'Failed to delete review' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'delete_review', resource_id: review.id, resource_type: 'review', details: {}, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unhandled action' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error in admin-manage-reviews:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
  }
});
