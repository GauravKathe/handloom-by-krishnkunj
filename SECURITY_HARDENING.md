# Admin Functions & AuthZ Hardening

This project now contains server-side admin functions to centralize privileged operations and enforce admin role checks. Below is a summary and how to test locally:

## Implemented Changes

- Created Supabase Functions (Deno):
  - `admin-update-order-status` — updates order status with admin-only enforcement and audit logging
  - `admin-get-user-roles` — fetch user_roles and associated profiles for admin UIs
  - `admin-manage-coupons` — create/update/delete coupons for admins
  - `admin-manage-products` — create/update/delete products and bulk delete with checks that prevent deleting products present in orders
  - `admin-manage-reviews` — create/update/delete reviews from admin UIs
  - `admin-manage-content` — manage site content (banners, categories, settings)

- Updated Admin UI pages to call these server functions instead of using client-side direct DB writes:
  - `src/pages/admin/Orders.tsx` — order status updates
  - `src/pages/admin/RoleManagement.tsx` — now uses `admin-get-user-roles`
  - `src/pages/admin/Coupons.tsx` — create/update/delete via `admin-manage-coupons`
  - `src/pages/admin/Products.tsx` — create/update/delete/bulk-delete via `admin-manage-products`
  - `src/pages/admin/Reviews.tsx` — admin review operations via `admin-manage-reviews`
  - `src/pages/admin/ContentManagement.tsx` — categories and site content updates via `admin-manage-content`
  - `src/pages/admin/Settings.tsx` & `src/pages/admin/MarqueeBanner.tsx` — now use `admin-manage-content` for updates

- Added audit logging for admin operations (inserts into `admin_audit_logs`) to track who performed which action.

## Security Notes & Recommendations

- The Supabase Service Role Key is only used inside these server functions and not leaked to client code. Ensure it remains in server-only env variables.
- All functions verify the request's `Authorization` header by calling `supabaseClient.auth.getUser()` and checking `user_roles` for `admin` role.
- Prefer to use `HttpOnly` cookies for session tokens in the UI to reduce XSS risk.
- Mark admin-only functionality in the app UI but rely on server-side checks (already implemented here).
- Add supabase RLS policies for tables such as `orders`, `user_roles`, `payments`, and `admin_audit_logs` to eliminate over-privileged access even if API tokens leak.

## Testing

A lightweight script is provided under `scripts/test-admin-functions.js` that can be used to exercise these functions using a JWT for an admin user and user key:

1. Install dependencies for the script (node-fetch/minimist):

```powershell
cd d:\KrishanKunj\handloom-by-krishnkunj
npm install node-fetch minimist
```

2. Run the script providing environment values or CLI args:

```powershell
node scripts/test-admin-functions.js --supabaseUrl="https://YOUR_SUPABASE_URL" --anonKey="YOUR_ANON_KEY" --adminJwt="YOUR_ADMIN_JWT" --userJwt="YOUR_NORMAL_USER_JWT"
```

It will:
- Create a product as admin, update it, and delete it.
- Attempt a create call with a normal user JWT (expected to fail).

## Next Steps

1. Add CI integration to verify that new server functions are present and that no service role key is committed in client code (e.g., add gitleaks or secret scanning step in CI). A sample GitHub Actions workflow has been added at `.github/workflows/secret-scan.yml` that runs gitleaks and the project build & lint step on pushes and PRs.
2. Add RLS policies to your database to lock rows to owners and roles.
3. A suggested set of RLS policy SQL is included in `sql/rls-policies.sql` — review and test in a staging environment.
3. Replace supabase anon key usage for UI client with mechanisms to avoid exposing long-lived admin keys.
4. Add integration tests for all admin functions under a secure environment in CI.

If you want, I can:
- Add the CI checks to the repo (gitleaks and a small integration test in GH Actions)
- Add RLS policy SQL recommendations for tables (I can generate SQL scripts to apply to your DB)
- Create unit/integration test harnesses using playwright or jest that sign in and call the API endpoints

Let me know which task to continue with next.
