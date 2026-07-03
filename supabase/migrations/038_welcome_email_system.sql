-- =============================================
-- 038_welcome_email_system.sql
-- Welcome email queue + idempotency (async, non-blocking for auth).
--
-- Flow:
--   auth.users INSERT/UPDATE (email confirmed or OAuth)
--     → queue row in welcome_email_outbox (fast, no HTTP)
--   Database Webhook on welcome_email_outbox INSERT
--     → Edge Function send_welcome_email
--   OR client invokes send_welcome_email after login (idempotent fallback)
--
-- Operator setup (Supabase Dashboard):
--   1. Authentication → SMTP: sender "TrabaGE" <noreply.trabage@gmail.com>
--   2. Database → Webhooks → INSERT on welcome_email_outbox
--      → POST https://<project>.supabase.co/functions/v1/send_welcome_email
--      → Header: x-welcome-webhook-secret = <WELCOME_WEBHOOK_SECRET>
--   3. Edge Function secrets: SMTP_*, WELCOME_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
-- =============================================

CREATE TABLE IF NOT EXISTS public.welcome_emails_sent (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.welcome_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  queued_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.welcome_emails_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_email_outbox ENABLE ROW LEVEL SECURITY;

-- No client policies: service role / SECURITY DEFINER only.

CREATE OR REPLACE FUNCTION public.claim_welcome_email_send(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.welcome_emails_sent (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_welcome_email_claim(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.welcome_emails_sent
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_welcome_email_ready(p_user auth.users)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_provider text;
BEGIN
  IF p_user.email IS NULL OR btrim(p_user.email) = '' THEN
    RETURN false;
  END IF;

  IF p_user.email_confirmed_at IS NOT NULL OR p_user.confirmed_at IS NOT NULL THEN
    RETURN true;
  END IF;

  v_provider := COALESCE(
    p_user.raw_app_meta_data->>'provider',
    p_user.raw_app_meta_data->'providers'->>0,
    ''
  );

  -- OAuth providers (Google, etc.) are confirmed on first sign-in.
  IF v_provider <> '' AND v_provider <> 'email' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_welcome_email_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ready boolean;
  v_name text;
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

  -- Skip if already sent or already queued.
  IF EXISTS (SELECT 1 FROM public.welcome_emails_sent WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.welcome_email_outbox (user_id, email, user_name)
  VALUES (NEW.id, NEW.email, v_name)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_welcome_email_insert ON auth.users;
CREATE TRIGGER on_auth_user_welcome_email_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_welcome_email_from_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_welcome_email_update ON auth.users;
CREATE TRIGGER on_auth_user_welcome_email_update
  AFTER UPDATE OF email_confirmed_at, confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_welcome_email_from_auth_user();

REVOKE ALL ON public.welcome_emails_sent FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.welcome_email_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.welcome_emails_sent TO service_role;
GRANT SELECT, INSERT, DELETE ON public.welcome_email_outbox TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_welcome_email_send(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_welcome_email_claim(uuid) TO service_role;
