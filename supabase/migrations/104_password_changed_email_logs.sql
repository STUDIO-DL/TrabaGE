-- 104_password_changed_email_logs.sql
-- Internal delivery log for password-changed confirmation emails (Resend / SMTP).
-- Edge Function writes with service role. No client access.

CREATE TABLE IF NOT EXISTS public.password_changed_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_changed_email_logs_user_id_idx
  ON public.password_changed_email_logs (user_id);

CREATE INDEX IF NOT EXISTS password_changed_email_logs_created_at_idx
  ON public.password_changed_email_logs (created_at DESC);

ALTER TABLE public.password_changed_email_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.password_changed_email_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.password_changed_email_logs FROM anon;
REVOKE ALL ON TABLE public.password_changed_email_logs FROM authenticated;

GRANT ALL ON TABLE public.password_changed_email_logs TO service_role;
