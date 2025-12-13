import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

function generateToken(len = 48) {
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  const securityHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsHeaders, ...securityHeaders } });
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { ...corsHeaders, ...securityHeaders } });

  const token = generateToken(32);
  const headers = new Headers();
  // Cookie should be accessible to JS (double-submit cookie) so not HttpOnly
  headers.set('Set-Cookie', `XSRF-TOKEN=${token}; Max-Age=3600; Path=/; Secure; SameSite=None`);
  headers.set('Content-Type', 'application/json');
  Object.entries({ ...corsHeaders, ...securityHeaders }).forEach(([k, v]) => headers.set(k, v));

  return new Response(JSON.stringify({ token }), { status: 200, headers });
});
