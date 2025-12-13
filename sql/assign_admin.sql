-- Assign Admin Role to User
-- Run this script in the Supabase SQL Editor

DO $$
DECLARE
  target_email TEXT := 'handloombykrishnkunj@gmail.com';
  target_user_id UUID;
BEGIN
  -- 1. Get the User ID from the auth.users table
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NOT NULL THEN
    -- 2. Insert or Update the user_roles table
    -- We use ON CONFLICT to avoid errors if the role is already assigned
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'admin';
    
    RAISE NOTICE 'SUCCESS: User % has been successfully assigned the ADMIN role.', target_email;
  ELSE
    RAISE NOTICE 'ERROR: User % was NOT found. Please ensure they have signed up and confirmed their email first.', target_email;
  END IF;
END $$;
