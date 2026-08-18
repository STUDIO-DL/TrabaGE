-- =============================================
-- 143_shared_opportunity_publish_hardening.sql
-- Ensure personal-user shared opportunities can be saved and read
-- immediately after publishing.
-- =============================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS application_url TEXT;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_application_url_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_application_url_check
  CHECK (
    application_url IS NULL
    OR (
      char_length(application_url) <= 2048
      AND application_url ~* '^https://'
    )
  ) NOT VALID;

DROP POLICY IF EXISTS "Users can read their own shared opportunities" ON public.jobs;

CREATE POLICY "Users can read their own shared opportunities"
ON public.jobs FOR SELECT TO authenticated
USING (
  source_type = 'user'
  AND shared_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can manage their shared opportunities" ON public.jobs;

CREATE POLICY "Users can manage their shared opportunities"
ON public.jobs FOR ALL TO authenticated
USING (
  source_type = 'user'
  AND shared_by_user_id = auth.uid()
  AND public.is_active_candidate(auth.uid())
)
WITH CHECK (
  source_type = 'user'
  AND shared_by_user_id = auth.uid()
  AND company_id IS NULL
  AND public.is_active_candidate(auth.uid())
);

NOTIFY pgrst, 'reload schema';
