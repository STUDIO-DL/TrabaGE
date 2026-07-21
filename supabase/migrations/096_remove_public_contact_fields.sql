-- =============================================
-- 096_remove_public_contact_fields.sql
-- Remove contact fields from public profile views.
-- Email and phone remain in account/profile tables for internal use only.
-- User-to-user communication is via internal messaging.
-- =============================================

DROP VIEW IF EXISTS public.candidate_profiles_public CASCADE;

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
  cp.social_links,
  cp.setup_complete,
  cp.is_active,
  cp.created_at,
  cp.updated_at
FROM public.candidate_profiles cp
WHERE coalesce(cp.is_active, true) = true
  AND public.is_public_app_user(cp.user_id);

DROP VIEW IF EXISTS public.company_profiles_public CASCADE;

CREATE OR REPLACE VIEW public.company_profiles_public
WITH (security_invoker = false) AS
SELECT
  co.user_id,
  co.company_name,
  co.company_type,
  co.sector,
  co.description,
  co.intro,
  co.city,
  co.country,
  co.address,
  co.website,
  co.founded_year,
  co.company_size,
  co.logo_path,
  co.cover_path,
  co.social_links,
  co.is_verified,
  co.verification_status,
  co.verified_status,
  co.setup_complete,
  co.is_active,
  co.created_at,
  co.updated_at
FROM public.company_profiles co
WHERE coalesce(co.is_active, true) = true
  AND public.is_public_app_user(co.user_id);

REVOKE ALL ON public.candidate_profiles_public FROM PUBLIC;
REVOKE ALL ON public.company_profiles_public FROM PUBLIC;
GRANT SELECT ON public.candidate_profiles_public TO anon, authenticated, service_role;
GRANT SELECT ON public.company_profiles_public TO anon, authenticated, service_role;
