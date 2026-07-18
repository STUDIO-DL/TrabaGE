-- 074_welcome_email_client_fallback.sql
-- Idempotent welcome-email queue callable by the authenticated user (webhook fallback).

CREATE OR REPLACE FUNCTION public.request_welcome_email_if_needed()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user auth.users;
  v_name text;
  v_account_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT public.is_welcome_email_ready(v_user) THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.welcome_emails_sent WHERE user_id = v_user.id) THEN
    RETURN false;
  END IF;

  v_name := COALESCE(
    NULLIF(btrim(v_user.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(v_user.raw_user_meta_data->>'name'), ''),
    ''
  );

  v_account_type := public.resolve_welcome_account_type(v_user.id);

  INSERT INTO public.welcome_email_outbox (user_id, email, user_name, account_type)
  VALUES (v_user.id, v_user.email, v_name, v_account_type)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.request_welcome_email_if_needed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_welcome_email_if_needed() TO authenticated;
