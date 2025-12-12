// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

declare const Deno: any;

serve(async (req: Request) => {
  const getAllowedOrigin = (origin: string | null): string => {
    const allowedOrigins = [Deno.env.get('SITE_URL') || ''].filter(Boolean);
    if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) return origin;
    return allowedOrigins[0] || '*';
  };

  const origin = req.headers.get('origin');
  const corsHeaders = {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsHeaders, ...securityHeaders } });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Only POST allowed' }), { status: 405, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data') && !contentType.startsWith('application/json')) {
      return new Response(JSON.stringify({ error: 'Invalid content type' }), { status: 400, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Missing file' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File size exceeds 5MB limit' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only images and PDFs allowed.' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // CSRF double-submit check
    const xsrfHeader = req.headers.get('x-csrf-token');
    const xsrfCookie = (() => {
      const cookies = req.headers.get('cookie') || '';
      const m = cookies.split(';').map((s: string) => s.trim()).find((c: string) => c.startsWith('XSRF-TOKEN='));
      return m ? m.split('=')[1] : null;
    })();
    if (!xsrfHeader || !xsrfCookie || xsrfHeader !== xsrfCookie) {
      return new Response(JSON.stringify({ error: 'CSRF token missing or invalid' }), { status: 403, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate-limit by IP
    try {
      const { globalRateLimiter } = await import('../utils/rate-limit.ts');
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const rate = globalRateLimiter.check(ip);
      if (!rate.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.warn('Rate limiter unavailable', e instanceof Error ? e.message : e);
    }

    // If SCAN_API_URL is configured, send to external scanning API
    const scanUrl = Deno.env.get('SCAN_API_URL');
    let safe = true;
    if (scanUrl) {
      const apiKey = Deno.env.get('SCAN_API_KEY');
      const scanForm = new FormData();
      scanForm.append('file', file);
      const scanRes = await fetch(scanUrl, {
        method: 'POST',
        headers: apiKey ? { 'x-api-key': apiKey } : {},
        body: scanForm
      });
      const scanBody = await scanRes.json().catch(() => ({}));
      if (!scanRes.ok || scanBody?.threat_found) {
        safe = false;
        console.warn('Scan detected threat or scan API returned error', scanBody);
      }
    } else {
      console.warn('No SCAN_API_URL provided; skipping malware scan');
      // Optionally: set safe = false to block uploads when scanning is required
      safe = true;
    }

    if (!safe) return new Response(JSON.stringify({ safe: false }), { status: 400, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });

    // Upload to Supabase storage
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    const fileExt = file.name.split('.').pop();
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${fileExt || 'dat'}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error } = await supabaseClient.storage.from('uploads').upload(fileName, buffer);
    if (error) {
      console.error('Upload failed', error.message);
      return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: urlData } = supabaseClient.storage.from('uploads').getPublicUrl(data.path);

    return new Response(JSON.stringify({ safe: true, path: data.path, url: urlData.publicUrl }), { headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Error in scan-upload:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
  }
});