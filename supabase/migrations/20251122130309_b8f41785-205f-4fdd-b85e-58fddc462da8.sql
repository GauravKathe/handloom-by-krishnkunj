-- First, get the user ID for handloombykrishnkunj@gmail.com
-- Then insert admin role for this user if not exists

-- Insert admin role for the admin user
-- Replace with actual user_id after checking auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'handloombykrishnkunj@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;