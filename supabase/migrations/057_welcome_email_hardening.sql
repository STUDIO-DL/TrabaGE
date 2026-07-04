-- =============================================
-- 057_welcome_email_hardening.sql
-- Harden welcome email: correct name handling, audit logs.
--
-- Flow (unchanged, backend-only):
--   auth.users INSERT / first email confirmation UPDATE
--     → welcome_email_outbox (fast, non-blocking)
--   Database Webhook on welcome_email_outbox INSERT
--     → Edge Function send_welcome_email
-- =============================================

CREATE TABLE IF NOT EXISTS public.welcome_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_welcome_email_logs_user_id
  ON public.welcome_email_logs (user_id, created_at DESC);

ALTER TABLE public.welcome_email_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.welcome_email_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.welcome_email_logs TO service_role;

-- Only use real profile names; never fall back to email local-part.
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

  IF EXISTS (SELECT 1 FROM public.welcome_emails_sent WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
    ''
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
