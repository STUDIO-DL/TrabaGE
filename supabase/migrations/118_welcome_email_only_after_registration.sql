-- 118_welcome_email_only_after_registration.sql
-- Welcome email must NOT fire when Google authenticates an unregistered identity.
--
-- Before: auth.users INSERT for OAuth (Google) queued welcome immediately because
--         is_welcome_email_ready() treats OAuth as "confirmed".
-- After:  queue only when a real TrabaGE registration exists (role/profile/signup
--         metadata). Google LOGIN orphans never queue. Google SIGNUP relies on
--         client RPC request_welcome_email_if_needed after completePostAuthFlow.
-- Email/password signup still queues on email confirmation UPDATE when registered.

CREATE OR REPLACE FUNCTION public.is_trabage_registration_complete(p_user auth.users)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_meta jsonb := coalesce(p_user.raw_user_meta_data, '{}'::jsonb);
  v_provider text;
BEGIN
  IF p_user.id IS NULL THEN
    RETURN false;
  END IF;

  -- Explicit signup form / pending account type metadata.
  IF nullif(btrim(coalesce(v_meta->>'role', '')), '') IS NOT NULL
     OR nullif(btrim(coalesce(v_meta->>'account_kind', '')), '') IS NOT NULL
     OR nullif(btrim(coalesce(v_meta->>'account_type', '')), '') IS NOT NULL
     OR nullif(btrim(coalesce(v_meta->>'company_name', '')), '') IS NOT NULL
     OR nullif(btrim(coalesce(v_meta->>'city', '')), '') IS NOT NULL THEN
    RETURN true;
  END IF;

  -- Registered TrabaGE profile rows.
  IF EXISTS (
    SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = p_user.id
  ) OR EXISTS (
    SELECT 1 FROM public.company_profiles cp WHERE cp.user_id = p_user.id
  ) THEN
    RETURN true;
  END IF;

  -- Bound role that is not a brand-new Google-only orphan.
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user.id
      AND lower(btrim(ur.role)) IN (
        'personal', 'candidate', 'business', 'company', 'organization', 'institution', 'admin'
      )
  ) THEN
    v_provider := coalesce(
      p_user.raw_app_meta_data->>'provider',
      p_user.raw_app_meta_data->'providers'->>0,
      ''
    );

    -- Fresh Google LOGIN often gets a default role via trigger before discard —
    -- that alone must NOT count as registration.
    IF v_provider = 'google'
       AND p_user.created_at IS NOT NULL
       AND p_user.last_sign_in_at IS NOT NULL
       AND abs(extract(epoch FROM (p_user.last_sign_in_at - p_user.created_at))) < 120
       AND coalesce(jsonb_array_length(p_user.raw_app_meta_data->'providers'), 1) <= 1
       AND nullif(btrim(coalesce(v_meta->>'role', '')), '') IS NULL
       AND nullif(btrim(coalesce(v_meta->>'account_kind', '')), '') IS NULL THEN
      RETURN false;
    END IF;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_trabage_registration_complete(auth.users) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trabage_registration_complete(auth.users) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_welcome_email_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_ready boolean;
  v_name text;
  v_account_type text;
  v_provider text;
BEGIN
  v_provider := coalesce(
    NEW.raw_app_meta_data->>'provider',
    NEW.raw_app_meta_data->'providers'->>0,
    ''
  );

  -- OAuth INSERT is NOT registration. Welcome is queued only via
  -- request_welcome_email_if_needed after TrabaGE registration completes.
  IF TG_OP = 'INSERT' AND v_provider <> '' AND v_provider <> 'email' THEN
    RETURN NEW;
  END IF;

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
    -- Email/password INSERT only when already confirmed (rare) AND registered.
    v_ready := public.is_welcome_email_ready(NEW);
  END IF;

  IF NOT v_ready THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_trabage_registration_complete(NEW) THEN
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

  -- Do not queue without a resolved account type (registration incomplete).
  IF v_account_type IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.welcome_email_outbox (user_id, email, user_name, account_type)
  VALUES (NEW.id, NEW.email, v_name, v_account_type)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

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

  -- Explicit registration-complete gate (Google LOGIN orphans must not pass).
  IF NOT public.is_trabage_registration_complete(v_user) THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.welcome_emails_sent WHERE user_id = v_user.id) THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.welcome_email_outbox WHERE user_id = v_user.id) THEN
    RETURN false;
  END IF;

  v_name := COALESCE(
    NULLIF(btrim(v_user.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(v_user.raw_user_meta_data->>'name'), ''),
    ''
  );

  v_account_type := public.resolve_welcome_account_type(v_user.id);
  IF v_account_type IS NULL THEN
    RETURN false;
  END IF;

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

COMMENT ON FUNCTION public.is_trabage_registration_complete(auth.users) IS
  'True only when the auth user has completed TrabaGE registration (profile/role/signup metadata), not mere Google OAuth identity.';

COMMENT ON FUNCTION public.request_welcome_email_if_needed() IS
  'ACCOUNT_REGISTRATION_COMPLETED: queue welcome email once after TrabaGE registration. Never for Google login of unregistered accounts.';

NOTIFY pgrst, 'reload schema';
