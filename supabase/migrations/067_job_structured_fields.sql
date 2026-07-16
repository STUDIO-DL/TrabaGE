-- =============================================
-- 067_job_structured_fields.sql
-- Add structured "El puesto" (role) field for job postings
-- =============================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS role TEXT;

COMMENT ON COLUMN public.jobs.role IS
  'Structured job role section ("El puesto"). Nullable for legacy rows; required on new publish in frontend.';

-- Extend text length check to include role (nullable, max 5000 chars)
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_text_length_check,
  ADD CONSTRAINT jobs_text_length_check
    CHECK (
      char_length(trim(title)) BETWEEN 1 AND 180
      AND (role IS NULL OR char_length(role) <= 5000)
      AND (description IS NULL OR char_length(description) <= 5000)
      AND (requirements IS NULL OR char_length(requirements) <= 5000)
      AND (benefits IS NULL OR char_length(benefits::text) <= 5000)
    ) NOT VALID;
