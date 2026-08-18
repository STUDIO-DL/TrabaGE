-- =============================================
-- 142_shared_opportunity_application_url.sql
-- Optional external link for personal-user shared opportunities.
-- =============================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS application_url TEXT;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_application_url_check,
  ADD CONSTRAINT jobs_application_url_check
    CHECK (
      application_url IS NULL
      OR (
        char_length(application_url) <= 2048
        AND application_url ~* '^https://'
      )
    ) NOT VALID;
