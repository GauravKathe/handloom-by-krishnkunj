import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

declare const Deno: any;

const getAllowedOrigin = (origin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('SITE_URL') || '',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://lovable.dev',
    'https://gptengineer.app',
    'https://handloombykrishnkunj.com',
    'https://www.handloombykrishnkunj.com'
  ].filter(Boolean);

  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return origin;
  }
  return allowedOrigins[0] || '*';
};

serve(async (req) => {
  const origin = req.headers.get('origin');

  const corsHeaders = {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

  try {
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

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (roleError || !roleData) return new Response(JSON.stringify({ error: 'Forbidden - Admins only' }), { status: 403, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

    // CSRF protection: double-submit check (cookie XSRF-TOKEN + header)
    const xsrfHeader = req.headers.get('x-csrf-token');
    const xsrfCookie = (() => {
      const cookies = req.headers.get('cookie') || '';
      const match = cookies.split(';').map(s => s.trim()).find(c => c.startsWith('XSRF-TOKEN='));
      return match ? match.split('=')[1] : null;
    })();

    if (!xsrfHeader || !xsrfCookie || xsrfHeader !== xsrfCookie) {
      return new Response(JSON.stringify({ error: 'CSRF token missing or invalid' }), { status: 403, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate-limit by IP
    try {
      const { globalRateLimiter } = await import('../utils/rate-limit.ts');
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const rate = globalRateLimiter.check(ip);
      if (!rate.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.warn('Rate limiter unavailable', e instanceof Error ? e.message : e);
    }

    const jsonData = await req.json();
    const action = jsonData?.action;
    let payload = jsonData?.payload;

    // Sanitize content server-side
    const { default: sanitizeHtml } = await import('https://esm.sh/sanitize-html@2.10.0');

    // deno-lint-ignore no-explicit-any
    const sanitizeRecursively = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      // deno-lint-ignore no-explicit-any
      const out: any = Array.isArray(obj) ? [] : {};
      for (const k in obj) {
        const v = obj[k];
        if (typeof v === 'string') {
          // sanitize HTML content & remove scripts
          out[k] = sanitizeHtml(v, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'blockquote']),
            allowedAttributes: {
              ...sanitizeHtml.defaults.allowedAttributes,
              img: ['src', 'alt', 'title', 'width', 'height']
            }
          });
        } else if (typeof v === 'object') {
          out[k] = sanitizeRecursively(v);
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    // Clean payload fields in-place if present
    if (payload) {
      payload = sanitizeRecursively(payload);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'save-banners') {
      const slides = payload?.slides;
      if (!Array.isArray(slides)) return new Response(JSON.stringify({ error: 'Invalid slides' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

      const { data: existing } = await adminClient.from('site_content').select('id').eq('section', 'homepage_hero').single();
      if (existing) {
        const { error } = await adminClient.from('site_content').update({ content: { bannerSlides: slides } }).eq('section', 'homepage_hero');
        if (error) return new Response(JSON.stringify({ error: 'Failed to insert banners' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
        try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'create_banners', resource_id: null, resource_type: 'site_content', details: { slides }, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      } else {
        const { error } = await adminClient.from('site_content').insert([{ section: 'homepage_hero', content: { bannerSlides: slides } }]);
        if (error) return new Response(JSON.stringify({ error: 'Failed to update banners' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
        try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'update_banners', resource_id: null, resource_type: 'site_content', details: { slides }, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (action === 'save-section') {
      const { section, content } = payload || {};
      if (!section || typeof content === 'undefined') return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      const { data: existing } = await adminClient.from('site_content').select('id').eq('section', section).single();
      if (existing) {
        const { error } = await adminClient.from('site_content').update({ content }).eq('section', section);
        if (error) return new Response(JSON.stringify({ error: 'Failed to update content' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      } else {
        const { error } = await adminClient.from('site_content').insert([{ section, content }]);
        if (error) return new Response(JSON.stringify({ error: 'Failed to create content' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (action === 'update-settings') {
      const settings = payload?.settings || payload?.content || {};
      if (!settings) return new Response(JSON.stringify({ error: 'Invalid settings payload' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      const { data: existing } = await adminClient.from('site_content').select('id').eq('section', 'settings').single();
      if (existing) {
        const { error } = await adminClient.from('site_content').update({ content: settings }).eq('section', 'settings');
        if (error) return new Response(JSON.stringify({ error: 'Failed to update settings' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      } else {
        const { error } = await adminClient.from('site_content').insert([{ section: 'settings', content: settings }]);
        if (error) return new Response(JSON.stringify({ error: 'Failed to create settings' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (action === 'create-category') {
      const { name, description, image_url } = payload || {};
      const { data, error } = await adminClient.from('categories').insert([{ name, description, image_url }]).select().single();
      if (error) return new Response(JSON.stringify({ error: 'Failed to create category' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'create_category', resource_id: data.id, resource_type: 'category', details: { name, description, image_url }, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true, category: data }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update-category') {
      const { id, name, description, image_url } = payload || {};
      if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      const { data, error } = await adminClient.from('categories').update({ name, description, image_url }).eq('id', id).select().single();
      if (error) return new Response(JSON.stringify({ error: 'Failed to update category' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'update_category', resource_id: id, resource_type: 'category', details: { name, description, image_url }, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true, category: data }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete-category') {
      const { id } = payload || {};
      if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      const { data: linked, error: checkErr } = await adminClient.from('products').select('id').eq('category_id', id).limit(1);
      if (checkErr) return new Response(JSON.stringify({ error: 'Failed to check linked products' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      if (linked && linked.length > 0) return new Response(JSON.stringify({ error: 'Cannot delete category - products are linked to this category' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      const { error } = await adminClient.from('categories').delete().eq('id', id);
      if (error) return new Response(JSON.stringify({ error: 'Failed to delete category' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'delete_category', resource_id: id, resource_type: 'category', details: {}, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unhandled action' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error in admin-manage-content:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
  }
});
