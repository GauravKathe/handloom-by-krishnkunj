-- Update product-images bucket to allow WebP format and set 3MB limit
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  file_size_limit = 3145728
WHERE name = 'product-images';