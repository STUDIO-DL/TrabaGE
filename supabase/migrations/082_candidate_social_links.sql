-- =============================================
-- 082_candidate_social_links.sql
-- Personal profile social network links (JSONB)
-- =============================================

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.candidate_profiles.social_links IS
  'Social network URLs for personal profiles: instagram, tiktok, youtube, facebook.';

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
  cp.contact_email,
  cp.contact_whatsapp,
  cp.social_links,
  cp.setup_complete,
  cp.is_active,
  cp.created_at,
  cp.updated_at
FROM public.candidate_profiles cp
WHERE coalesce(cp.is_active, true) = true;

REVOKE ALL ON public.candidate_profiles_public FROM PUBLIC;
GRANT SELECT ON public.candidate_profiles_public TO anon, authenticated, service_role;
