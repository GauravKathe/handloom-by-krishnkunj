-- 1. Create table to track processed webhook payments (prevent replay attacks)
CREATE TABLE public.processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_processed_webhook_events_payment_id ON public.processed_webhook_events(payment_id);

-- RLS: Only service role can access (via edge functions)
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- 2. Create table for login attempt tracking (account lockout)
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for checking recent attempts
CREATE INDEX idx_login_attempts_email_created ON public.login_attempts(email, created_at DESC);

-- RLS: No direct access - managed via RPC functions
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 3. Create auth event logging table
CREATE TABLE public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_auth_events_user_id ON public.auth_events(user_id);
CREATE INDEX idx_auth_events_email ON public.auth_events(email);
CREATE INDEX idx_auth_events_created_at ON public.auth_events(created_at DESC);

-- RLS: Admins can view, system can insert
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view auth events"
ON public.auth_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Function to check if account is locked (too many failed attempts)
CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count integer;
  lockout_until timestamp with time zone;
  lockout_minutes integer := 15;
  max_attempts integer := 5;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*)
  INTO failed_count
  FROM public.login_attempts
  WHERE email = lower(p_email)
    AND success = false
    AND created_at > now() - interval '15 minutes';

  IF failed_count >= max_attempts THEN
    -- Get the time of the 5th failed attempt
    SELECT created_at + interval '15 minutes'
    INTO lockout_until
    FROM public.login_attempts
    WHERE email = lower(p_email)
      AND success = false
      AND created_at > now() - interval '15 minutes'
    ORDER BY created_at DESC
    OFFSET max_attempts - 1
    LIMIT 1;

    RETURN json_build_object(
      'locked', true,
      'attempts', failed_count,
      'unlock_at', lockout_until
    );
  END IF;

  RETURN json_build_object(
    'locked', false,
    'attempts', failed_count,
    'remaining', max_attempts - failed_count
  );
END;
$$;

-- 5. Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email text,
  p_success boolean,
  p_ip_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, success)
  VALUES (lower(p_email), p_ip_address, p_success);

  -- If successful, clear old failed attempts for this email
  IF p_success THEN
    DELETE FROM public.login_attempts
    WHERE email = lower(p_email)
      AND success = false
      AND created_at < now() - interval '1 hour';
  END IF;
END;
$$;

-- 6. Function to log auth events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id uuid,
  p_email text,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auth_events (user_id, email, event_type, metadata)
  VALUES (p_user_id, lower(p_email), p_event_type, p_metadata);
END;
$$;

-- 7. Function to check if webhook event was already processed
CREATE OR REPLACE FUNCTION public.check_webhook_processed(p_payment_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.processed_webhook_events
    WHERE payment_id = p_payment_id
  );
END;
$$;

-- 8. Function to mark webhook as processed
CREATE OR REPLACE FUNCTION public.mark_webhook_processed(
  p_payment_id text,
  p_event_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.processed_webhook_events (payment_id, event_type)
  VALUES (p_payment_id, p_event_type)
  ON CONFLICT (payment_id) DO NOTHING;
  
  RETURN FOUND;
END;
$$;

-- 9. Cleanup function for old data
CREATE OR REPLACE FUNCTION public.cleanup_security_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean login attempts older than 24 hours
  DELETE FROM public.login_attempts
  WHERE created_at < now() - interval '24 hours';

  -- Clean rate limits older than 1 hour
  DELETE FROM public.rate_limits
  WHERE created_at < now() - interval '1 hour';

  -- Clean processed webhook events older than 7 days
  DELETE FROM public.processed_webhook_events
  WHERE processed_at < now() - interval '7 days';

  -- Clean auth events older than 90 days (keep for audit)
  DELETE FROM public.auth_events
  WHERE created_at < now() - interval '90 days';
END;
$$;