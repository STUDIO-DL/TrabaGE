-- =============================================
-- 068_welcome_email_account_type.sql
-- Personalize welcome emails by account type (personal / business / organization).
--
-- Resolves role at queue time from user_roles (+ company_type for legacy rows).
-- Edge Function re-resolves at send time for authoritative template selection.
-- =============================================

ALTER TABLE public.welcome_email_outbox
  ADD COLUMN IF NOT EXISTS account_type text;

ALTER TABLE public.welcome_email_logs
  ADD COLUMN IF NOT EXISTS account_type text;

CREATE OR REPLACE FUNCTION public.resolve_welcome_account_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role text;
  v_company_type text;
  v_meta_role text;
  v_meta_kind text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT lower(btrim(ur.role))
  INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id;

  IF v_role = 'candidate' THEN
    v_role := 'personal';
  ELSIF v_role = 'company' THEN
    SELECT coalesce(cp.company_type, '')
    INTO v_company_type
    FROM public.company_profiles cp
    WHERE cp.user_id = p_user_id;

    IF v_company_type IN ('Institucion publica', 'ONG') THEN
      v_role := 'organization';
    ELSE
      v_role := 'business';
    END IF;
  ELSIF v_role = 'institution' THEN
    v_role := 'organization';
  END IF;

  IF v_role IN ('personal', 'business', 'organization') THEN
    RETURN v_role;
  END IF;

  SELECT
    lower(btrim(coalesce(u.raw_user_meta_data->>'role', ''))),
    lower(btrim(coalesce(u.raw_user_meta_data->>'account_kind', '')))
  INTO v_meta_role, v_meta_kind
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_meta_role = 'candidate' THEN v_meta_role := 'personal'; END IF;
  IF v_meta_role = 'company' THEN v_meta_role := 'business'; END IF;
  IF v_meta_role = 'institution' THEN v_meta_role := 'organization'; END IF;
  IF v_meta_kind = 'candidate' THEN v_meta_kind := 'personal'; END IF;
  IF v_meta_kind = 'company' THEN v_meta_kind := 'business'; END IF;
  IF v_meta_kind = 'institution' THEN v_meta_kind := 'organization'; END IF;

  IF v_meta_role IN ('personal', 'business', 'organization') THEN
    RETURN v_meta_role;
  END IF;

  IF v_meta_kind IN ('personal', 'business', 'organization') THEN
    RETURN v_meta_kind;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_welcome_account_type(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_welcome_account_type(uuid) TO service_role;

-- Backfill nullable outbox rows (safe no-op if column just added).
UPDATE public.welcome_email_outbox o
SET account_type = public.resolve_welcome_account_type(o.user_id)
WHERE o.account_type IS NULL;

ALTER TABLE public.welcome_email_outbox
  DROP CONSTRAINT IF EXISTS welcome_email_outbox_account_type_check;

ALTER TABLE public.welcome_email_outbox
  ADD CONSTRAINT welcome_email_outbox_account_type_check
  CHECK (account_type IS NULL OR account_type IN ('personal', 'business', 'organization'));

ALTER TABLE public.welcome_email_logs
  DROP CONSTRAINT IF EXISTS welcome_email_logs_account_type_check;

ALTER TABLE public.welcome_email_logs
  ADD CONSTRAINT welcome_email_logs_account_type_check
  CHECK (account_type IS NULL OR account_type IN ('personal', 'business', 'organization'));

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
