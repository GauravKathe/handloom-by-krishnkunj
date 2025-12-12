-- RLS Policies for key tables
-- NOTE: Review these policies and adapt columns / table names if they differ.
-- 1) orders: users can insert and view their own orders; admins can view and update orders.
-- This assumes you have a user_roles table with mapping user_id -> role and an 'admin' role.

-- Enable RLS first
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow users to INSERT orders where user_id matches auth.uid()
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (user_id = auth.uid());

-- Allow users to SELECT their own orders; Admins can SELECT all
CREATE POLICY "orders_select_owner_or_admin" ON public.orders
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Allow admins to UPDATE orders; users can't update orders (except if you want to allow some limited fields, consider add policy)
CREATE POLICY "orders_update_admin_only" ON public.orders
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Prevent regular users from deleting orders; admin only
CREATE POLICY "orders_delete_admin_only" ON public.orders
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- 2) products: public can SELECT; admin-only for INSERT/UPDATE/DELETE
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_public" ON public.products
  FOR SELECT
  USING (true);

CREATE POLICY "products_modify_admin_only" ON public.products
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- 3) coupons: select for all authenticated users, modify only admin
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_select_auth" ON public.coupons
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "coupons_modify_admin_only" ON public.coupons
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- 4) reviews: users can insert their own reviews; admin can view and manage
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_insert_owner" ON public.reviews
  FOR INSERT
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_select_owner_or_admin" ON public.reviews
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "reviews_update_owner_or_admin" ON public.reviews
  FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "reviews_delete_admin_only" ON public.reviews
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- 5) user_roles: users can read their own role; admin only (who can assign roles)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own role (Critical to prevent recursion in other policies)
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow admins to read all roles (Recursive check if not careful, but usually acceptable if 'read own' exists)
-- This policy allows an admin to see other users' roles. 
-- Since the first policy allows reading their own role, the subquery here will succeed for the admin themselves.
CREATE POLICY "user_roles_read_all_if_admin" ON public.user_roles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'));

CREATE POLICY "user_roles_modify_admin_only" ON public.user_roles
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'));

-- 6) admin_audit_logs: only server (service role) or admins should SELECT/INSERT
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_logs_select_admin_only" ON public.admin_audit_logs
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'));

-- INSERT to admin_audit_logs should ideally be performed by a server-side process using the service_role key (bypasses RLS),
-- otherwise allow insertion only if the user is an admin. You may prefer to disallow client-side inserts entirely.
CREATE POLICY "admin_audit_logs_insert_admin_only" ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'));

-- Recommendations & Notes
-- - After applying RLS policies, test in a staging environment thoroughly since enabling RLS can break insert/update flows by anonymous clients.
-- - Review any function or internal processes that use the service_role key; they will bypass RLS and can still modify data. This is OK if they are trusted server processes.
-- - Lock down the service_role key and rotate it if it was committed.
-- - Consider adding an admin-only DB role and using Postgres SECURITY DEFINER functions for privileged operations instead of service_role key in some cases.
-- - Implement periodic audits on admin_audit_logs to ensure only allowed operations are done.

-- Add defensive indexes for policies where necessary for performance
ANALYZE public.orders;
ANALYZE public.products;
ANALYZE public.coupons;
ANALYZE public.reviews;
ANALYZE public.admin_audit_logs;
