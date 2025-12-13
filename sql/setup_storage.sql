-- Create Storage Buckets and Policies for Admin Uploads

-- 1. Create 'product-images' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to product images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Policy: Allow Admin upload/delete access to product images
CREATE POLICY "Admin Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'product-images' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. Create 'banners' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to banners
CREATE POLICY "Public Banner Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'banners' );

-- Policy: Allow Admin upload/delete access to banners
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

-- 3. Create 'categories' bucket (if used)
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

-- 4. Create 'uploads' bucket (used by scan-upload function)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Uploads Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'uploads' );

-- Note: scan-upload uses service_role key, so it bypasses RLS for uploads.
-- But we can add a policy for admin direct access just in case.
CREATE POLICY "Admin Uploads Access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'uploads' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
