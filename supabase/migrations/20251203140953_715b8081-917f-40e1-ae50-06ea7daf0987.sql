-- Add original_price (required) and offer_price (optional) columns to products table
ALTER TABLE public.products 
ADD COLUMN original_price numeric NOT NULL DEFAULT 0,
ADD COLUMN offer_price numeric;

-- Migrate existing price data to original_price
UPDATE public.products SET original_price = price WHERE original_price = 0;