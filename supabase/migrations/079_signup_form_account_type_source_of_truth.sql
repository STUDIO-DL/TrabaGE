-- =============================================
-- 079_signup_form_account_type_source_of_truth.sql
-- Registration form metadata (role + account_kind + account_type) is the
-- authoritative account type. Never overwrite explicit employer signup with
-- a default personal role.
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_meta JSONB := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role TEXT := lower(trim(coalesce(v_meta->>'role', '')));
  v_account_kind TEXT := lower(trim(coalesce(v_meta->>'account_kind', v_meta->>'account_type', '')));
  v_explicit_role BOOLEAN := FALSE;
BEGIN
  IF v_role IN ('candidate') THEN v_role := 'personal'; END IF;
  IF v_role IN ('company') THEN v_role := 'business'; END IF;
  IF v_role IN ('institution') THEN v_role := 'organization'; END IF;

  IF v_account_kind IN ('personal', 'candidate') THEN v_role := 'personal'; v_explicit_role := TRUE; END IF;
  IF v_account_kind IN ('business', 'company') THEN v_role := 'business'; v_explicit_role := TRUE; END IF;
  IF v_account_kind IN ('organization', 'institution') THEN v_role := 'organization'; v_explicit_role := TRUE; END IF;

  IF v_role IN ('personal', 'business', 'organization') THEN
    v_explicit_role := v_explicit_role OR coalesce(v_meta->>'role', '') <> '';
  END IF;

  -- Only implicit Google OAuth (no signup form metadata) defaults to personal.
  IF v_role NOT IN ('personal', 'business', 'organization') THEN
    v_role := 'personal';
    v_explicit_role := FALSE;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_explicit_role THEN
    BEGIN
      PERFORM public.provision_user_profile(NEW.id, NULL);
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Assigns role from signup form metadata (role/account_kind/account_type). Provisions profile immediately for email signup.';
