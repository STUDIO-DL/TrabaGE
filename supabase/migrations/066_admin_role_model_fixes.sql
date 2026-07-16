-- =============================================
-- 066_admin_role_model_fixes.sql
-- Align admin RPCs with personal / business / organization roles (064).
-- Fixes broken admin deactivate, profile edit, and role change after migration 064.
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_set_user_active(
  p_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  PERFORM public.require_admin();

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id;

  IF v_role IN ('personal', 'candidate') THEN
    UPDATE public.candidate_profiles
    SET is_active = p_is_active,
        updated_at = now()
    WHERE user_id = p_user_id;

    IF p_is_active = false THEN
      UPDATE public.posts
      SET is_hidden = true
      WHERE author_id = p_user_id;
    END IF;
  ELSIF v_role IN ('business', 'organization', 'company') THEN
    UPDATE public.company_profiles
    SET is_active = p_is_active,
        updated_at = now()
    WHERE user_id = p_user_id;

    IF p_is_active = false THEN
      UPDATE public.jobs
      SET admin_hidden = true,
          status = 'closed',
          updated_at = now()
      WHERE company_id = p_user_id;

      UPDATE public.posts
      SET is_hidden = true
      WHERE author_id = p_user_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Admin users cannot be deactivated from this action';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := lower(trim(coalesce(p_role, '')));
BEGIN
  PERFORM public.require_admin();

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot change their own role';
  END IF;

  IF v_role IN ('candidate') THEN
    v_role := 'personal';
  ELSIF v_role IN ('company') THEN
    v_role := 'business';
  ELSIF v_role IN ('institution') THEN
    v_role := 'organization';
  END IF;

  IF v_role NOT IN ('personal', 'business', 'organization', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.user_roles
  SET role = v_role
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  PERFORM public.require_admin();

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id;

  IF v_role IN ('personal', 'candidate') THEN
    UPDATE public.candidate_profiles
    SET full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
        city = COALESCE(NULLIF(trim(p_city), ''), city),
        contact_email = COALESCE(NULLIF(trim(p_contact_email), ''), contact_email),
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF v_role IN ('business', 'organization', 'company') THEN
    UPDATE public.company_profiles
    SET company_name = COALESCE(NULLIF(trim(p_company_name), ''), company_name),
        city = COALESCE(NULLIF(trim(p_city), ''), city),
        contact_email = COALESCE(NULLIF(trim(p_contact_email), ''), contact_email),
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Admin profile data is managed through authentication settings';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
