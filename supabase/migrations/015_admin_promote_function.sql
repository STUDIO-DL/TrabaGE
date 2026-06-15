-- =============================================
-- 015_admin_promote_function.sql
-- Allow service_role to promote users to admin (bootstrap script)
-- =============================================

GRANT ALL ON TABLE public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_to_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(UUID) TO service_role;
