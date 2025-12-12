/*
  Simple integration helper script to test admin functions.
  Usage:
    node scripts/test-admin-functions.js --adminJwt=<JWT> --anonKey=<ANON> --supabaseUrl=<URL>

  It runs a handful of checks against deployed Supabase Functions (must be accessible).
  For security reasons, provide the admin JWT via environment variable or CLI argument.
*/

import fetch from 'node-fetch';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));

const SUPABASE_URL = argv.supabaseUrl || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = argv.anonKey || process.env.SUPABASE_ANON_KEY;
const ADMIN_JWT = argv.adminJwt || process.env.TEST_ADMIN_JWT;
const USER_JWT = argv.userJwt || process.env.TEST_USER_JWT;

function getEndpoint(functionName) {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}

async function callFunction(name, jwt, body) {
  const res = await fetch(getEndpoint(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { parsed = { text }; }
  return { status: res.status, body: parsed };
}

(async function () {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_JWT) {
    console.error('Please provide SUPABASE_URL, SUPABASE_ANON_KEY and ADMIN_JWT via env or CLI args');
    process.exit(1);
  }

  console.log('Testing admin-manage-products as admin (should succeed)');
  const createResp = await callFunction('admin-manage-products', ADMIN_JWT, { action: 'create', product: { name: 'TEST-SSR-Product', price: 100 } });
  console.log('Create response:', createResp.status, createResp.body);

  if (createResp.status !== 200 || !createResp.body?.product?.id) {
    console.error('Create failed or did not return product.id');
    process.exit(1);
  }

  const productId = createResp.body.product.id;

  console.log('Testing update');
  const updateResp = await callFunction('admin-manage-products', ADMIN_JWT, { action: 'update', product: { id: productId, name: 'TEST-SSR-Product-Updated', price: 150 } });
  console.log('Update response:', updateResp.status, updateResp.body);

  console.log('Testing delete');
  const deleteResp = await callFunction('admin-manage-products', ADMIN_JWT, { action: 'delete', product: { id: productId } });
  console.log('Delete response:', deleteResp.status, deleteResp.body);

  if (USER_JWT) {
    console.log('Testing admin-manage-products as normal user (should fail)');
    const userTest = await callFunction('admin-manage-products', USER_JWT, { action: 'create', product: { name: 'HACK', price: 10 } });
    console.log('User test response:', userTest.status, userTest.body);
  }
})();
