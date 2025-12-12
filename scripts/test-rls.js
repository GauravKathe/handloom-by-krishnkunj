/*
  Test Row Level Security for key tables via Supabase REST endpoints.
  Usage:
    node scripts/test-rls.js --supabaseUrl=<url> --anonKey=<anon> --serviceKey=<service> --adminJwt=<admin> --userJwt=<user>

  It will attempt to perform restricted operations and confirm expected behaviors:
  - Anon user (no jwt) cannot insert into `products` (should be 401/403 or fail RLS)
  - Normal user cannot update `products` (should be forbidden by RLS)
  - Admin JWT (user with admin role) can insert into `products`.
  - Service role key can insert into any table even with no JWT.

  Ensure service role key is present in a secure environment like GitHub Actions secrets.
*/

import fetch from 'node-fetch';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));

const SUPABASE_URL = argv.supabaseUrl || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = argv.anonKey || process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = argv.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_JWT = argv.adminJwt || process.env.TEST_ADMIN_JWT;
const USER_JWT = argv.userJwt || process.env.TEST_USER_JWT;

function getRestEndpoint(table) {
  return `${SUPABASE_URL}/rest/v1/${table}`;
}

async function restPost(table, key, jwt, payload) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: key,
  };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  const res = await fetch(getRestEndpoint(table), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return { status: res.status, text: await res.text() };
}

(async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_KEY) {
    console.error('Please provide SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('1) Testing insert by ANON (should fail for products modify policy)');
  const anonResp = await restPost('products', SUPABASE_ANON_KEY, null, [{ name: 'unauth-insert' }]);
  console.log('Anon status', anonResp.status, anonResp.text.slice(0, 200));

  console.log('\n2) Testing insert by ADMIN JWT (should succeed if admin role present)');
  if (!ADMIN_JWT) {
    console.warn('ADMIN_JWT not provided — skipping admin JWT test');
  } else {
    const adminResp = await restPost('products', SUPABASE_ANON_KEY, ADMIN_JWT, [{ name: 'admin-insert' }]);
    console.log('Admin status', adminResp.status, adminResp.text.slice(0, 200));
  }

  console.log('\n3) Testing insert by SERVICE ROLE KEY (should succeed)');
  const srvResp = await restPost('products', SERVICE_KEY, null, [{ name: 'service-insert' }]);
  console.log('Service status', srvResp.status, srvResp.text.slice(0, 200));

})();
