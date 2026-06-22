-- =============================================
-- 030_enhance_candidate_profiles.sql
-- Add missing common profile fields to candidate_profiles
-- =============================================

ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

COMMENT ON COLUMN public.candidate_profiles.country IS 'Country of residence.';
COMMENT ON COLUMN public.candidate_profiles.phone_number IS 'Contact phone number.';
COMMENT ON COLUMN public.candidate_profiles.website_url IS 'URL to personal website or portfolio.';
COMMENT ON COLUMN public.candidate_profiles.linkedin_url IS 'URL to LinkedIn profile.';