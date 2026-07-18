-- 081_welcome_email_send_once_hardening.sql
-- Harden idempotency: never re-queue if already sent OR already in outbox.

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

  -- Permanent send marker (claim_welcome_email_send inserts before Resend).
  IF EXISTS (SELECT 1 FROM public.welcome_emails_sent WHERE user_id = v_user.id) THEN
    RETURN false;
  END IF;

  -- Pending queue row — webhook already fired or will fire once.
  IF EXISTS (SELECT 1 FROM public.welcome_email_outbox WHERE user_id = v_user.id) THEN
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

CREATE OR REPLACE FUNCTION public.queue_welcome_email_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_ready boolean;
  v_name text;
  v_account_type text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_ready := public.is_welcome_email_ready(NEW)
      AND OLD.email_confirmed_at IS NULL
      AND NEW.email_confirmed_at IS NOT NULL;

    IF NOT v_ready THEN
      v_ready := public.is_welcome_email_ready(NEW)
        AND OLD.confirmed_at IS NULL
        AND NEW.confirmed_at IS NOT NULL;
    END IF;
  ELSE
    v_ready := public.is_welcome_email_ready(NEW);
  END IF;

  IF NOT v_ready THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.welcome_emails_sent WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.welcome_email_outbox WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
    ''
  );

  v_account_type := public.resolve_welcome_account_type(NEW.id);

  INSERT INTO public.welcome_email_outbox (user_id, email, user_name, account_type)
  VALUES (NEW.id, NEW.email, v_name, v_account_type)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.request_welcome_email_if_needed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_welcome_email_if_needed() TO authenticated;
