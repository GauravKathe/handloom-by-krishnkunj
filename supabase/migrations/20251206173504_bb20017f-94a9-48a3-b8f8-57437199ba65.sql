
-- Add foreign key constraint for product_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_product_id_fkey' 
    AND table_name = 'order_items'
  ) THEN
    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Make product_id nullable so orders persist even if product is deleted
ALTER TABLE public.order_items 
ALTER COLUMN product_id DROP NOT NULL;
