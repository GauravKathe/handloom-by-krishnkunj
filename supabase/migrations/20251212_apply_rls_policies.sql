-- Migration: Apply RLS policies for Admin Authorization Hardening
-- Target: Staging environment only
-- Created: 2025-12-12

-- NOTE: This is a Supabase migration file. You can apply it via:
--   supabase db push --linked (for linked projects)
-- Or copy/paste into Supabase SQL editor.

-- Enable RLS on critical tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Orders RLS Policies
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_select_owner_or_admin" ON public.orders;
CREATE POLICY "orders_select_owner_or_admin" ON public.orders
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

DROP POLICY IF EXISTS "orders_update_admin_only" ON public.orders;
CREATE POLICY "orders_update_admin_only" ON public.orders
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

DROP POLICY IF EXISTS "orders_delete_admin_only" ON public.orders;
CREATE POLICY "orders_delete_admin_only" ON public.orders
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Products RLS Policies
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "products_modify_admin_only" ON public.products;
CREATE POLICY "products_modify_admin_only" ON public.products
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Coupons RLS Policies
DROP POLICY IF EXISTS "coupons_select_auth" ON public.coupons;
CREATE POLICY "coupons_select_auth" ON public.coupons
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "coupons_modify_admin_only" ON public.coupons;
CREATE POLICY "coupons_modify_admin_only" ON public.coupons
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Reviews RLS Policies
DROP POLICY IF EXISTS "reviews_insert_owner" ON public.reviews;
CREATE POLICY "reviews_insert_owner" ON public.reviews
  FOR INSERT
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews_select_owner_or_admin" ON public.reviews;
CREATE POLICY "reviews_select_owner_or_admin" ON public.reviews
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "reviews_update_owner_or_admin" ON public.reviews;
CREATE POLICY "reviews_update_owner_or_admin" ON public.reviews
  FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "reviews_delete_admin_only" ON public.reviews;
CREATE POLICY "reviews_delete_admin_only" ON public.reviews
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- User Roles RLS Policies
DROP POLICY IF EXISTS "user_roles_select_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_select_admin_only" ON public.user_roles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'));

DROP POLICY IF EXISTS "user_roles_modify_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_modify_admin_only" ON public.user_roles
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'));

-- Admin Audit Logs RLS Policies
DROP POLICY IF EXISTS "admin_audit_logs_select_admin_only" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_select_admin_only" ON public.admin_audit_logs
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'));

DROP POLICY IF EXISTS "admin_audit_logs_insert_admin_only" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_insert_admin_only" ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'));
