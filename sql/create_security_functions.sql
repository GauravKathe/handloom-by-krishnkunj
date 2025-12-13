-- Create missing security RPC functions
-- Ref: check_account_lockout, record_login_attempt, log_auth_event

-- 1. check_account_lockout
CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql security definer
AS $$
DECLARE
  failed_attempts INT;
  last_attempt TIMESTAMP;
  is_locked BOOLEAN := false;
  unlock_time TIMESTAMP;
BEGIN
  -- Cleanup old attempts (older than 30 mins)
  DELETE FROM public.login_attempts 
  WHERE email = p_email 
  AND created_at < NOW() - INTERVAL '30 minutes';

  -- Count recent failed attempts
  SELECT COUNT(*), MAX(created_at)
  INTO failed_attempts, last_attempt
  FROM public.login_attempts
  WHERE email = p_email AND success = false;

  -- Lockout logic: 5 failed attempts locks for 15 minutes
  IF failed_attempts >= 5 THEN
    IF last_attempt > NOW() - INTERVAL '15 minutes' THEN
      is_locked := true;
      unlock_time := last_attempt + INTERVAL '15 minutes';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'locked', is_locked,
    'unlock_at', unlock_time
  );
END;
$$;

-- 2. record_login_attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email TEXT, p_success BOOLEAN, p_ip_address TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql security definer
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success, ip_address)
  VALUES (p_email, p_success, p_ip_address);
END;
$$;

-- 3. log_auth_event
CREATE OR REPLACE FUNCTION public.log_auth_event(p_user_id UUID, p_email TEXT, p_event_type TEXT, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS VOID
LANGUAGE plpgsql security definer
AS $$
BEGIN
  INSERT INTO public.auth_events (user_id, email, event_type, metadata)
  VALUES (p_user_id, p_email, p_event_type, p_metadata);
END;
$$;

-- Grant permissions to public (anon) and authenticated users so they can be called from frontend
GRANT EXECUTE ON FUNCTION public.check_account_lockout TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event TO anon, authenticated;
