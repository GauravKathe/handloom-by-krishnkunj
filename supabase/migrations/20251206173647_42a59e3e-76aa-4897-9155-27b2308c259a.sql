
-- Add item_total column to order_items
ALTER TABLE public.order_items
ADD COLUMN item_total NUMERIC;

-- Update existing records to calculate item_total from price (price already stores total for the item)
UPDATE public.order_items
SET item_total = price
WHERE item_total IS NULL;
