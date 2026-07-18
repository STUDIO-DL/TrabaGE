-- =============================================
-- 085_admin_panel_production.sql
-- Production admin panel: dashboard stats, employer lists, manual verify, account active check
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  PERFORM public.require_admin();

  SELECT jsonb_build_object(
    'registered_users', (
      SELECT count(*)::INT
      FROM public.user_roles ur
      WHERE ur.role <> 'admin'
    ),
    'registered_companies', (
      SELECT count(*)::INT
      FROM public.user_roles ur
      WHERE ur.role = 'business'
    ),
    'registered_organizations', (
      SELECT count(*)::INT
      FROM public.user_roles ur
      WHERE ur.role = 'organization'
    ),
    'verified_companies', (
      SELECT count(*)::INT
      FROM public.company_profiles cp
      JOIN public.user_roles ur ON ur.user_id = cp.user_id
      WHERE ur.role IN ('business', 'organization')
        AND (
          cp.is_verified = TRUE
          OR cp.verified_status = 'verified'
          OR cp.verification_status = 'approved'
        )
    ),
    'pending_verifications', (
      SELECT count(*)::INT
      FROM public.verification_requests vr
      WHERE vr.status = 'pending'
    ),
    'publications', (
      SELECT count(*)::INT
      FROM public.posts p
      WHERE p.is_hidden = FALSE
    ),
    'active_jobs', (
      SELECT count(*)::INT
      FROM public.jobs j
      WHERE j.status = 'active'
        AND j.admin_hidden = FALSE
    ),
    'pending_reports', (
      SELECT count(*)::INT
      FROM public.reports r
      WHERE r.status = 'pending'
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_companies(p_account_role TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  company_name TEXT,
  sector TEXT,
  city TEXT,
  logo_path TEXT,
  company_type TEXT,
  account_role TEXT,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  verification_status TEXT,
  verified_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := lower(trim(coalesce(p_account_role, '')));
BEGIN
  PERFORM public.require_admin();

  IF v_role IN ('company') THEN
    v_role := 'business';
  ELSIF v_role IN ('institution') THEN
    v_role := 'organization';
  END IF;

  IF v_role <> '' AND v_role NOT IN ('business', 'organization') THEN
    RAISE EXCEPTION 'Invalid account role filter';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
    cp.company_name,
    cp.sector,
    cp.city,
    cp.logo_path,
    cp.company_type,
    ur.role AS account_role,
    coalesce(cp.is_active, TRUE) AS is_active,
    coalesce(cp.is_verified, FALSE) AS is_verified,
    cp.verification_status,
    cp.verified_status,
    cp.created_at
  FROM public.company_profiles cp
  JOIN public.user_roles ur ON ur.user_id = cp.user_id
  WHERE ur.role IN ('business', 'organization')
    AND (v_role = '' OR ur.role = v_role)
  ORDER BY cp.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_companies(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_companies(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_manual_verify_company(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  PERFORM public.require_admin();

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id;

  IF v_role NOT IN ('business', 'organization', 'company') THEN
    RAISE EXCEPTION 'Solo cuentas Business u organización pueden verificarse';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_profiles cp WHERE cp.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Perfil de empresa no encontrado';
  END IF;

  UPDATE public.company_profiles
  SET
    is_verified = TRUE,
    verification_status = 'approved',
    verified_status = 'verified',
    verified_at = NOW(),
    verified_by = auth.uid(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manual_verify_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_manual_verify_company(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  RETURN QUERY
  SELECT
    ur.user_id,
    au.email::TEXT,
    coalesce(
      nullif(trim(au.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(au.raw_user_meta_data->>'name'), ''),
      split_part(au.email, '@', 1)
    ) AS full_name,
    ur.created_at
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.role = 'admin'
  ORDER BY ur.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_admins() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_my_account_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := public.get_my_role();
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  IF v_role IN ('personal', 'candidate') THEN
    RETURN coalesce(
      (SELECT cp.is_active FROM public.candidate_profiles cp WHERE cp.user_id = auth.uid()),
      TRUE
    );
  END IF;

  IF v_role IN ('business', 'organization', 'company') THEN
    RETURN coalesce(
      (SELECT cp.is_active FROM public.company_profiles cp WHERE cp.user_id = auth.uid()),
      TRUE
    );
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.is_my_account_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_my_account_active() TO authenticated;

-- Return type changed (added company_type); CREATE OR REPLACE cannot alter TABLE return columns.
DROP FUNCTION IF EXISTS public.admin_list_users();

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
  company_type TEXT,
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
    co.company_type,
    COALESCE(cp.is_active, co.is_active, TRUE) AS is_active,
    ur.created_at
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  LEFT JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
  LEFT JOIN public.company_profiles co ON co.user_id = ur.user_id
  WHERE ur.role <> 'admin'
  ORDER BY ur.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

DROP POLICY IF EXISTS "Admin read verification requests" ON public.verification_requests;
CREATE POLICY "Admin read verification requests" ON public.verification_requests
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

NOTIFY pgrst, 'reload schema';
