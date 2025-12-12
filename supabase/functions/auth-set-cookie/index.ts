import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
  // Only allow POST
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...securityHeaders } });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { ...securityHeaders } });

  try {
    // Rate-limit auth set cookie to mitigate brute-force attempts
    try {
      const { globalRateLimiter } = await import('../utils/rate-limit.ts');
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const rate = globalRateLimiter.check(ip);
      if (!rate.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      console.warn('Rate limiter unavailable', e instanceof Error ? e.message : e);
    }

    const { token, expires_in } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });

    const maxAge = Number(expires_in) || 60 * 60 * 8; // default 8 hours
    const cookie = `sb_jwt=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;

    const headers = new Headers();
    headers.set('Set-Cookie', cookie);
    headers.set('Content-Type', 'application/json');

    // Add secure headers
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...securityHeaders, ...Object.fromEntries(headers.entries()) } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
  }
});
