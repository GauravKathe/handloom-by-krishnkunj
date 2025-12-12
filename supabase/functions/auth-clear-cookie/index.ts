import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...securityHeaders } });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { ...securityHeaders } });

  const headers = new Headers();
  headers.set('Set-Cookie', 'sb_jwt=deleted; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict');
  headers.set('Content-Type', 'application/json');
  headers.set('Strict-Transport-Security', securityHeaders['Strict-Transport-Security']);
  headers.set('X-Content-Type-Options', securityHeaders['X-Content-Type-Options']);
  headers.set('X-Frame-Options', securityHeaders['X-Frame-Options']);
  headers.set('Referrer-Policy', securityHeaders['Referrer-Policy']);

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...securityHeaders, ...Object.fromEntries(headers.entries()) } });
});
