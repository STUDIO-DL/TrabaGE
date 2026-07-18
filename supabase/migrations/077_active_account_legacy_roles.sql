-- =============================================
-- 077_active_account_legacy_roles.sql
-- Align is_active_candidate / is_active_company with get_my_role() (076):
-- legacy user_roles values candidate/company/institution must count as active.
-- =============================================

CREATE OR REPLACE FUNCTION public.is_active_candidate(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND lower(coalesce(ur.role, '')) IN ('personal', 'candidate')
      AND coalesce(cp.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_company(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.company_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND lower(coalesce(ur.role, '')) IN ('business', 'organization', 'company', 'institution')
      AND coalesce(cp.is_active, true) = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_candidate(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_candidate(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_company(UUID) TO anon, authenticated, service_role;
