import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

function generateToken(len = 48) {
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...securityHeaders } });
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { ...securityHeaders } });

  const token = generateToken(32);
  const headers = new Headers();
  // Cookie should be accessible to JS (double-submit cookie) so not HttpOnly
  headers.set('Set-Cookie', `XSRF-TOKEN=${token}; Max-Age=3600; Path=/; Secure; SameSite=Lax`);
  headers.set('Content-Type', 'application/json');
  headers.set('Strict-Transport-Security', securityHeaders['Strict-Transport-Security']);
  headers.set('X-Content-Type-Options', securityHeaders['X-Content-Type-Options']);
  headers.set('X-Frame-Options', securityHeaders['X-Frame-Options']);
  headers.set('Referrer-Policy', securityHeaders['Referrer-Policy']);

  return new Response(JSON.stringify({ token }), { status: 200, headers });
});
