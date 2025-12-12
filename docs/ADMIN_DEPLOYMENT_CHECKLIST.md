# Admin Functions Deployment Checklist

This checklist helps ensure a safe deployment of server-side admin functions and overall AuthZ & RLS hardening.

1. Rotate Secrets and Remove from Git History 🔒
   - Rotate Supabase service role key, anon key, and Razorpay keys if any were ever committed.
   - Purge `.env` from git history (BFG or git filter-repo) if it contains secrets.
   - Add a `pre-commit` hook and CI validation to avoid future commits with secrets.

2. CI Secret Scanning and Linting ✅
   - Ensure the GitHub Actions workflow `secret-scan.yml` runs on PRs to detect leaks.
   - Use `gitleaks` during CI to detect inadvertent key commits.
   - Add `npm run lint` to CI with an allowlist for files that must be migrated.

3. Deploy Serverless Functions (Supabase) 🚀
   - Deploy server functions (Deno) to Supabase; set the following env vars via the Supabase UI (or use secret manager):
     - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only), any other environment variables such as `RAZORPAY_KEY_*` or `RAZORPAY_WEBHOOK_SECRET`.
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is only available to serverless functions and not the client app.

4. Apply RLS policies in Staging and Validate 🧪
   - Apply SQL in `sql/rls-policies.sql` to a staging database.
   - Run `scripts/test-rls.js` against staging to validate RLS behavior.
   - Validate admin functions rely on the `service_role_key` and still work (test via `scripts/test-admin-functions.js`).

5. Update Client Code to Use Server Functions 🔐
   - Ensure no client code performs privileged writes to admin-protected tables (`products`, `products` updates/inserts/deletes, `coupons` writes, `user_roles`). If there are, they must call server functions instead.
   - Verify admin pages were updated to call `supabase.functions.invoke('admin-...')`.

6. Audit Logging & Observability 📋
   - Ensure all admin functions write a record to `admin_audit_logs` with the fields: `user_id`, `action`, `resource_type`, `resource_id`, `details`, `created_at`.
   - Provide a dedicated logging pipeline for alerting and monitoring (Sentry, Datadog, or Supabase logs). You may also send critical events to a Slack channel or an external SIEM.

7. CI Integration for Admin Function Tests 🧞
   - Add a GitHub secrets for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_ADMIN_JWT`, `TEST_USER_JWT`.
   - Add `admin-integration.yml` to run `scripts/test-admin-functions.js` and `scripts/test-rls.js` in CI and ensure they pass before merging.

8. Pre-production Checks
   - Run integration tests with admin and user JWTs.
   - Confirm role checks work as expected (admin functions fail for normal users).
   - Confirm RLS rejects invalid client requests and allows only expected operations.

9. Post-deployment checks
   - Monitor logs for suspicious admin operations.
   - Confirm `admin_audit_logs` contains audit entries for admin actions.
   - Validate CI policies to block accidental commits with secrets.

10. Long-term
   - Consider using `Postgres SECURITY DEFINER` functions for certain admin operations to reduce exposure to the service role key.
   - Consider implementing a Kubernetes-backed server to centralize environment keys for RLS-sensitive tasks.

Make sure to test each step in a non-production environment first.
