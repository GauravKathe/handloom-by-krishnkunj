-- Fix order_items RLS policies to allow users to insert their own order items
DROP POLICY IF EXISTS "Admins can insert order items" ON public.order_items;

-- Allow users to insert order items for their own orders
CREATE POLICY "Users can insert own order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Also allow admins to insert order items
CREATE POLICY "Admins can insert order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));