-- 105_account_goodbye_email_employer.sql
-- Farewell email for business/organization account deletion.
-- Captures email + role inside delete_own_account BEFORE deleting auth.users,
-- returns a one-time goodbye_token for the client to trigger send best-effort.

CREATE TABLE IF NOT EXISTS public.account_goodbye_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('business', 'organization')),
  send_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS account_goodbye_email_outbox_status_idx
  ON public.account_goodbye_email_outbox (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.account_goodbye_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid REFERENCES public.account_goodbye_email_outbox (id) ON DELETE SET NULL,
  email text,
  account_type text,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_goodbye_email_logs_created_at_idx
  ON public.account_goodbye_email_logs (created_at DESC);

ALTER TABLE public.account_goodbye_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_goodbye_email_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.account_goodbye_email_outbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.account_goodbye_email_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.account_goodbye_email_outbox TO service_role;
GRANT ALL ON TABLE public.account_goodbye_email_logs TO service_role;

-- Return type changes from prior versions require DROP before recreate.
DROP FUNCTION IF EXISTS public.delete_own_account();

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_role text;
  v_account_type text;
  v_token uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT btrim(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  SELECT r.role INTO v_role
  FROM public.user_roles r
  WHERE r.user_id = v_uid;

  -- Employer accounts only (legacy company → business). Personal is excluded.
  IF v_role IN ('business', 'organization', 'company')
     AND v_email IS NOT NULL
     AND v_email <> '' THEN
    v_account_type := CASE
      WHEN v_role = 'organization' THEN 'organization'
      ELSE 'business'
    END;
    v_token := gen_random_uuid();

    INSERT INTO public.account_goodbye_email_outbox (
      email,
      account_type,
      send_token,
      status
    ) VALUES (
      v_email,
      v_account_type,
      v_token,
      'pending'
    );
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;

  IF v_token IS NOT NULL THEN
    RETURN jsonb_build_object('goodbye_token', v_token);
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
