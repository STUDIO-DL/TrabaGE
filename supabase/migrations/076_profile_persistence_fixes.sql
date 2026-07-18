-- =============================================
-- 076_profile_persistence_fixes.sql
-- Fix profile read/write consistency:
--   1. Normalize get_my_role() legacy aliases (candidate/company)
--   2. Expose company contact_name/contact_role in public view
-- =============================================

-- â”€â”€â”€ 1. get_my_role: normalize legacy role values for RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE lower(coalesce(ur.role, ''))
    WHEN 'candidate' THEN 'personal'
    WHEN 'company' THEN 'business'
    WHEN 'institution' THEN 'organization'
    ELSE ur.role
  END
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_my_role() IS
  'Returns normalized account role for RLS (personal/business/organization/admin).';

-- Drop required: PostgreSQL cannot reorder/rename view columns via CREATE OR REPLACE
DROP VIEW IF EXISTS public.company_profiles_public CASCADE;

-- â”€â”€â”€ 2. company_profiles_public: include HR contact identity fields â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE VIEW public.company_profiles_public
WITH (security_invoker = false) AS
SELECT
  co.user_id,
  co.company_name,
  co.company_type,
  co.sector,
  co.description,
  co.city,
  co.country,
  co.address,
  co.website,
  co.founded_year,
  co.company_size,
  co.logo_path,
  co.cover_path,
  co.contact_name,
  co.contact_role,
  co.contact_email,
  co.contact_phone,
  co.contact_whatsapp,
  co.social_links,
  co.is_verified,
  co.verification_status,
  co.verified_status,
  co.setup_complete,
  co.is_active,
  co.created_at,
  co.updated_at
FROM public.company_profiles co
WHERE coalesce(co.is_active, true) = true;

REVOKE ALL ON public.company_profiles_public FROM PUBLIC;
GRANT SELECT ON public.company_profiles_public TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.candidate_profiles_public CASCADE;

-- â”€â”€â”€ 3. candidate_profiles_public: include cover_path for public headers â”€â”€â”€â”€

CREATE OR REPLACE VIEW public.candidate_profiles_public
WITH (security_invoker = false) AS
SELECT
  cp.user_id,
  cp.full_name,
  cp.headline,
  cp.about,
  cp.city,
  cp.province,
  cp.country,
  cp.sector,
  cp.avatar_path,
  cp.cover_path,
  cp.years_experience,
  cp.show_education_in_intro,
  cp.intro_education_id,
  cp.contact_email,
  cp.contact_whatsapp,
  cp.setup_complete,
  cp.is_active,
  cp.created_at,
  cp.updated_at
FROM public.candidate_profiles cp
WHERE coalesce(cp.is_active, true) = true;

REVOKE ALL ON public.candidate_profiles_public FROM PUBLIC;
GRANT SELECT ON public.candidate_profiles_public TO anon, authenticated, service_role;
