-- =============================================
-- 046_day9_admin_panel_hardening.sql
-- Admin panel RPCs for production-safe management actions.
-- =============================================

CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.require_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  full_name TEXT,
  company_name TEXT,
  city TEXT,
  avatar_path TEXT,
  logo_path TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  RETURN QUERY
  SELECT
    ur.user_id,
    au.email::TEXT,
    ur.role,
    cp.full_name,
    co.company_name,
    COALESCE(cp.city, co.city) AS city,
    cp.avatar_path,
    co.logo_path,
    CASE
      WHEN ur.role = 'admin' THEN TRUE
      ELSE COALESCE(cp.is_active, co.is_active, TRUE)
    END AS is_active,
    ur.created_at
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  LEFT JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
  LEFT JOIN public.company_profiles co ON co.user_id = ur.user_id
  ORDER BY ur.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

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

  IF v_role = 'candidate' THEN
    UPDATE public.candidate_profiles
    SET is_active = p_is_active,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF v_role = 'company' THEN
    UPDATE public.company_profiles
    SET is_active = p_is_active,
        updated_at = now()
    WHERE user_id = p_user_id;
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
BEGIN
  PERFORM public.require_admin();

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot change their own role';
  END IF;

  IF p_role NOT IN ('candidate', 'company', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.user_roles
  SET role = p_role
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

  IF v_role = 'candidate' THEN
    UPDATE public.candidate_profiles
    SET full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
        city = COALESCE(NULLIF(trim(p_city), ''), city),
        contact_email = COALESCE(NULLIF(trim(p_contact_email), ''), contact_email),
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF v_role = 'company' THEN
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

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot delete their own account';
  END IF;

  DELETE FROM auth.users
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_job_moderation(
  p_job_id UUID,
  p_admin_hidden BOOLEAN,
  p_status TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'paused', 'closed') THEN
    RAISE EXCEPTION 'Invalid job status';
  END IF;

  UPDATE public.jobs
  SET admin_hidden = p_admin_hidden,
      status = COALESCE(p_status, status),
      updated_at = now()
  WHERE id = p_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_job_moderation(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_job_moderation(UUID, BOOLEAN, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_post_hidden(
  p_post_id UUID,
  p_is_hidden BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  UPDATE public.posts
  SET is_hidden = p_is_hidden
  WHERE id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_post_hidden(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_post_hidden(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_post(p_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  DELETE FROM public.posts
  WHERE id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_post(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_post(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admin delete reports" ON public.reports;
CREATE POLICY "Admin delete reports" ON public.reports
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

GRANT DELETE ON public.reports TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_report(p_report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  DELETE FROM public.reports
  WHERE id = p_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_report(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_report(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS user_roles_role_created_idx
  ON public.user_roles (role, created_at DESC);

CREATE INDEX IF NOT EXISTS reports_status_created_idx
  ON public.reports (status, created_at DESC);
