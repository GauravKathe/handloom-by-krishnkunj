import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsHeaders, ...securityHeaders } });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { ...corsHeaders, ...securityHeaders } });

  try {
    // Rate-limit auth set cookie to mitigate brute-force attempts
    try {
      const { globalRateLimiter } = await import('../utils/rate-limit.ts');
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const rate = globalRateLimiter.check(ip);
      if (!rate.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.warn('Rate limiter unavailable', e instanceof Error ? e.message : e);
    }

    const { token, expires_in } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });

    const maxAge = Number(expires_in) || 60 * 60 * 8; // default 8 hours
    const cookie = `sb_jwt=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;

    const headers = new Headers();
    headers.set('Set-Cookie', cookie);
    headers.set('Content-Type', 'application/json');
    Object.entries({ ...corsHeaders, ...securityHeaders }).forEach(([k, v]) => headers.set(k, v));

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } });
  }
});
