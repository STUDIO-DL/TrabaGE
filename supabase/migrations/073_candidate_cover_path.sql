-- =============================================
-- 073_candidate_cover_path.sql
-- Personal profile cover image (storage path in candidate-avatars bucket)
-- =============================================

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS cover_path TEXT;

COMMENT ON COLUMN public.candidate_profiles.cover_path IS
  'Storage path for the personal profile cover image (candidate-avatars bucket).';
