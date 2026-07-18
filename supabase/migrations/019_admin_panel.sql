-- =============================================
-- 019_admin_panel.sql
-- Admin panel: is_active, platform_settings, moderation fields, RLS
-- =============================================

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS admin_hidden BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_check
  CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_name TEXT NOT NULL DEFAULT 'TrabaGE',
  support_email TEXT NOT NULL DEFAULT 'support@trabage.org',
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read platform settings" ON public.platform_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin update platform settings" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT UPDATE ON public.platform_settings TO authenticated;

-- Admin read all user roles
CREATE POLICY "Admin read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

-- Admin update profiles (soft deactivate)
CREATE POLICY "Admin update candidates" ON public.candidate_profiles
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admin update companies" ON public.company_profiles
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Admin jobs moderation
CREATE POLICY "Admin read all jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admin update jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Admin posts moderation
CREATE POLICY "Admin update posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admin delete posts" ON public.posts
  FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');

-- Admin reports
CREATE POLICY "Admin read reports" ON public.reports
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admin update reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

GRANT SELECT, UPDATE ON public.reports TO authenticated;

-- Admin read all applications (for job stats)
CREATE POLICY "Admin read applications" ON public.applications
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

-- Admin list users with email (auth.users)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  full_name TEXT,
  company_name TEXT,
  city TEXT,
  avatar_url TEXT,
  logo_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden listar usuarios';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    au.email::TEXT,
    ur.role,
    cp.full_name,
    co.company_name,
    COALESCE(cp.city, co.city) AS city,
    cp.avatar_url,
    co.logo_url,
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

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

DROP POLICY IF EXISTS "Public read jobs" ON public.jobs;
CREATE POLICY "Public read jobs" ON public.jobs
  FOR SELECT USING (status = 'active' AND admin_hidden = FALSE);

DROP POLICY IF EXISTS "Public read posts" ON public.posts;
CREATE POLICY "Public read posts" ON public.posts
  FOR SELECT USING (is_hidden = FALSE);
