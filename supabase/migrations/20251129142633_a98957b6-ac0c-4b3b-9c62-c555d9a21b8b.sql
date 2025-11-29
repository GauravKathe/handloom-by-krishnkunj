-- First, remove the CASCADE delete
ALTER TABLE public.order_items 
DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- Add it back without CASCADE
ALTER TABLE public.order_items
ADD CONSTRAINT order_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.products(id);

-- Add snapshot columns to preserve product details in order history
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS product_image TEXT,
ADD COLUMN IF NOT EXISTS product_description TEXT;

-- Update existing order_items with current product data
UPDATE public.order_items oi
SET 
  product_name = p.name,
  product_image = p.images[1],
  product_description = p.description
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.product_name IS NULL;