-- =============================================
-- 009_job_preferences.sql
-- Candidate job search preferences for recommendations
-- =============================================

ALTER TABLE candidate_profiles
  ADD COLUMN IF NOT EXISTS job_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
