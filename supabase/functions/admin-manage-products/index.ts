import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': '*',
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
    // CSRF double-submit check (for cookie-based sessions)
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

    const body: unknown = await req.json();
    const parsedBody = (body && typeof body === 'object') ? body as Record<string, any> : {};
    const { action, product } = parsedBody || {};
    if (!action || !['create','update','delete','bulk-delete'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Server-side sanitization of product payload
    const { default: sanitizeHtml } = await import('https://esm.sh/sanitize-html@2.10.0');
    const sanitizeRecursively = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const out: any = Array.isArray(obj) ? [] : {};
      for (const k in obj) {
        const v = obj[k];
        if (typeof v === 'string') {
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

    const safeProduct = product ? sanitizeRecursively(product) : product;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'create') {
      if (!product || !product.name || (!product.price && product.price !== 0)) {
        return new Response(JSON.stringify({ error: 'Invalid product payload' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
      const { data, error } = await adminClient.from('products').insert(safeProduct).select().single();
      if (error) return new Response(JSON.stringify({ error: 'Failed to create product' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      // Audit log
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'create_product', resource_id: data.id, resource_type: 'product', details: product, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true, product: data }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update') {
      if (!product || !product.id) {
        return new Response(JSON.stringify({ error: 'Invalid product id for update' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: productData, error } = await adminClient.from('products').update(safeProduct).eq('id', product.id).select().single();
      if (error) return new Response(JSON.stringify({ error: 'Failed to update product' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'update_product', resource_id: product.id, resource_type: 'product', details: product, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true, product: productData }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      if (!product || !product.id) {
        return new Response(JSON.stringify({ error: 'Invalid product id for delete' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      }
      // Prevent delete if product is in any order_items
      const { data: orderItems, error: checkError } = await adminClient.from('order_items').select('product_id').eq('product_id', product.id).limit(1);
      if (checkError) return new Response(JSON.stringify({ error: 'Failed to check product usage' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      if (orderItems && orderItems.length > 0) return new Response(JSON.stringify({ error: 'Cannot delete product - part of existing orders' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

      const { error } = await adminClient.from('products').delete().eq('id', product.id);
      if (error) return new Response(JSON.stringify({ error: 'Failed to delete product' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
      try { await adminClient.from('admin_audit_logs').insert({ user_id: user.id, action: 'delete_product', resource_id: product.id, resource_type: 'product', details: {}, created_at: new Date().toISOString() }); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'bulk-delete') {
      const ids: string[] = (product && Array.isArray(product.ids)) ? product.ids : [];
      // Check if any products in ids are part of orders
      const { data: orderItems, error: checkError } = await adminClient.from('order_items').select('product_id').in('product_id', ids);
      if (checkError) return new Response(JSON.stringify({ error: 'Failed to check products' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

      const productsInOrders = new Set(orderItems?.map((i: any) => i.product_id) || []);
      const productsToDelete = ids.filter(id => !productsInOrders.has(id));

      if (productsToDelete.length > 0) {
        const { error } = await adminClient.from('products').delete().in('id', productsToDelete);
        if (error) return new Response(JSON.stringify({ error: 'Failed to delete some products' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
        try { await adminClient.from('admin_audit_logs').insert(productsToDelete.map((id: string) => ({ user_id: user.id, action: 'delete_product', resource_id: id, resource_type: 'product', details: {}, created_at: new Date().toISOString() }))); } catch (e) { console.warn('Audit log insert failed', e instanceof Error ? e.message : e); }
      }

      return new Response(JSON.stringify({ success: true, deleted: productsToDelete, blocked: Array.from(productsInOrders) }), { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unhandled action' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error in admin-manage-products:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
  }
});