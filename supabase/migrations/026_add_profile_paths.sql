-- =============================================
-- 026_add_profile_paths.sql
-- Add cover_path to company_profiles and cv_path to candidate_profiles
-- =============================================

-- Add cover image path to company profiles
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS cover_path TEXT;

COMMENT ON COLUMN public.company_profiles.cover_path IS 'Storage path for the company cover image.';

-- Add CV path to candidate profiles
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS cv_path TEXT;

COMMENT ON COLUMN public.candidate_profiles.cv_path IS 'Storage path for the candidate''s main CV file.';