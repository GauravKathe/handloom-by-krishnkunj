-- Create Storage Buckets and Policies for Admin Uploads

-- 1. Create 'product-images' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Products Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

CREATE POLICY "Admin Products Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'product-images' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. Create 'site-content' bucket (used by ContentManagement for banners and categories)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-content', 'site-content', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Site Content Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'site-content' );

CREATE POLICY "Admin Site Content Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'site-content' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  bucket_id = 'site-content'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3. Create 'banners' bucket (keep as backup or if used elsewhere)
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Banner Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'banners' );

CREATE POLICY "Admin Banner Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'banners' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  bucket_id = 'banners'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4. Create 'categories' bucket (keep as backup)
INSERT INTO storage.buckets (id, name, public)
VALUES ('categories', 'categories', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Category Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'categories' );

CREATE POLICY "Admin Category Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'categories' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  bucket_id = 'categories'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 5. Create 'uploads' bucket (used by scan-upload function)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Uploads Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'uploads' );

-- Note: scan-upload uses service_role key, so it bypasses RLS for uploads.
-- Added admin policy just in case direct access is attempted.
CREATE POLICY "Admin Uploads Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'uploads' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
