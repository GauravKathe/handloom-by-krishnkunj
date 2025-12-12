-- Fix profiles table RLS to require authentication for viewing own profile
-- Drop existing policy that doesn't check for authentication
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new policy with explicit authentication check
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Fix insert policy to also check authentication
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Fix update policy to also check authentication
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Fix admins view policy to require authentication
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));