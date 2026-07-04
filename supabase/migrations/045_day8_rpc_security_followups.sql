-- =============================================
-- 045_day8_rpc_security_followups.sql
-- RPC permission tightening and remaining high-traffic indexes.
-- =============================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_followers(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_path TEXT,
  headline TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> p_user_id AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
    cp.full_name,
    cp.avatar_path,
    cp.headline,
    f.created_at AS followed_at
  FROM public.follows f
  JOIN public.candidate_profiles cp ON cp.user_id = f.user_id
  WHERE f.target_id = p_user_id
    AND f.target_type = 'company'
  ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_followers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_followers(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS verification_requests_company_created_idx
  ON public.verification_requests (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS verification_requests_status_created_idx
  ON public.verification_requests (status, created_at DESC);
