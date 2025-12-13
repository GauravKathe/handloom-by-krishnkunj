-- Create Storage Buckets and Policies for Admin Uploads
-- Updated to handle existing policies gracefully by dropping them first.

-- 1. Create 'product-images' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Products Access" ON storage.objects;
CREATE POLICY "Public Products Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

DROP POLICY IF EXISTS "Admin Products Access" ON storage.objects;
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

-- 2. Create 'site-content' bucket (CRITICAL for banners)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-content', 'site-content', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Site Content Access" ON storage.objects;
CREATE POLICY "Public Site Content Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'site-content' );

DROP POLICY IF EXISTS "Admin Site Content Access" ON storage.objects;
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

-- 3. Create 'uploads' bucket (used by scan-upload function)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Uploads Access" ON storage.objects;
CREATE POLICY "Public Uploads Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'uploads' );

-- Note: scan-upload uses service_role key, so it bypasses RLS for uploads.
-- Added admin policy just in case direct access is attempted.
DROP POLICY IF EXISTS "Admin Uploads Access" ON storage.objects;
CREATE POLICY "Admin Uploads Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'uploads' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
