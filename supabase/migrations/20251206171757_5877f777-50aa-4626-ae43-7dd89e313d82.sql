-- Add SKU field to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;

-- Add variant snapshot fields to order_items for permanent records
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_sku text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_color text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_fabric text;

-- Create index on SKU for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);