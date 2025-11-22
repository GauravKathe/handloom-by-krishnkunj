-- Add admin SELECT policy for coupons to view all coupons
CREATE POLICY "Admins can view all coupons"
ON public.coupons
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));