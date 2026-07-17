-- =============================================
-- 070_candidate_intro_fields.sql
-- Candidate intro/header fields: sector, education intro display
-- =============================================

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS show_education_in_intro BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS intro_education_id UUID REFERENCES public.education(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.candidate_profiles.sector IS 'Primary industry/sector for profile intro.';
COMMENT ON COLUMN public.candidate_profiles.show_education_in_intro IS 'When true, show selected education in profile header.';
COMMENT ON COLUMN public.candidate_profiles.intro_education_id IS 'Education entry to display in profile header when show_education_in_intro is true.';

CREATE INDEX IF NOT EXISTS candidate_profiles_intro_education_idx
  ON public.candidate_profiles (intro_education_id)
  WHERE intro_education_id IS NOT NULL;

-- Extend public directory view with intro-visible fields
DROP VIEW IF EXISTS public.candidate_profiles_public;
CREATE VIEW public.candidate_profiles_public
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
