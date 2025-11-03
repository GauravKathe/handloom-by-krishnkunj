-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
);

-- Storage policies for product images
CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Create storage bucket for site content images (banners, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-content',
  'site-content',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
);

-- Storage policies for site content
CREATE POLICY "Admins can upload site content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-content' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update site content"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-content' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete site content"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-content' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view site content"
ON storage.objects
FOR SELECT
USING (bucket_id = 'site-content');

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percentage NUMERIC NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  minimum_purchase_amount NUMERIC NOT NULL DEFAULT 0,
  max_usage_limit INTEGER NOT NULL DEFAULT 1,
  current_usage_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Coupon policies
CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
USING (status = 'active' AND expiry_date > now());

CREATE POLICY "Admins can insert coupons"
ON public.coupons
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coupons"
ON public.coupons
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete coupons"
ON public.coupons
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add coupon tracking to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Create site_content table
CREATE TABLE public.site_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on site_content
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Site content policies
CREATE POLICY "Anyone can view site content"
ON public.site_content
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert site content"
ON public.site_content
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site content"
ON public.site_content
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site content"
ON public.site_content
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default site content
INSERT INTO public.site_content (section, content) VALUES
('homepage_hero', '{"title": "Handloom By Krishnkunj", "subtitle": "Authentic Handmade Sarees", "description": "Discover the finest collection of handwoven sarees crafted with love and tradition"}'),
('about_us', '{"title": "About Us", "content": "We are passionate about preserving the art of handloom weaving and bringing you the finest handmade sarees."}'),
('contact', '{"phone": "+91 1234567890", "email": "handloombykrishnkunj@gmail.com", "address": "Your Address Here", "description": "Get in touch with us for any queries"}')
ON CONFLICT (section) DO NOTHING;

-- Create trigger for updating updated_at on coupons
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on site_content
CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();