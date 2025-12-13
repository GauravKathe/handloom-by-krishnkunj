-- 1. Fix Missing RLS Policies for Site Content & Categories

-- Site Content (Banners, content sections)
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read site content
CREATE POLICY "site_content_select_public" ON public.site_content
FOR SELECT USING (true);

-- Allow only admins to modify site content
CREATE POLICY "site_content_modify_admin" ON public.site_content
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "categories_select_public" ON public.categories
FOR SELECT USING (true);

-- Allow only admins to modify categories
CREATE POLICY "categories_modify_admin" ON public.categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Add Ons (if missing)
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "add_ons_select_public" ON public.add_ons
FOR SELECT USING (true);

CREATE POLICY "add_ons_modify_admin" ON public.add_ons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- 2. ASSIGN ADMIN ROLE AUTOMATICALLY
-- This block finds the user by email and assigns the 'admin' role.
DO $$
DECLARE
  target_email TEXT := 'handloombykrishnkunj@gmail.com';
  target_user_id UUID;
BEGIN
  -- Get user ID from auth.users (works in Supabase SQL Editor)
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NOT NULL THEN
    -- Upsert into user_roles to ensure they are admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'admin';
    RAISE NOTICE 'SUCCESS: assigned admin role to %', target_email;
  ELSE
    RAISE NOTICE 'WARNING: User % not found. Please sign up first.', target_email;
  END IF;
END $$;
