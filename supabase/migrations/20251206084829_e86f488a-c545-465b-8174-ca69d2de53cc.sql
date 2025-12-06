-- Drop and recreate the storage policies for site-content bucket with improved admin check
DROP POLICY IF EXISTS "Admins can upload site content" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site content" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site content" ON storage.objects;

-- Recreate with explicit public schema reference
CREATE POLICY "Admins can upload site content" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'site-content' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update site content" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'site-content' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete site content" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'site-content' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);