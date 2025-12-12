-- Add explicit policies to processed_webhook_events table
-- This table should only be accessed via SECURITY DEFINER functions
CREATE POLICY "No direct access - use RPC functions only"
ON public.processed_webhook_events
FOR ALL
USING (false)
WITH CHECK (false);

-- Add explicit policies to login_attempts table  
-- This table should only be accessed via SECURITY DEFINER functions
CREATE POLICY "No direct access - use RPC functions only"
ON public.login_attempts
FOR ALL
USING (false)
WITH CHECK (false);