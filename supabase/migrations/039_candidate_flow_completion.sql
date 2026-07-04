-- =============================================
-- 039_candidate_flow_completion.sql
-- Candidate flow completion: saved jobs, withdrawals, notification cleanup.
-- =============================================

-- Saved jobs
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS saved_jobs_user_created_idx
  ON public.saved_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS saved_jobs_job_id_idx
  ON public.saved_jobs (job_id);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users manage own saved jobs"
ON public.saved_jobs
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;

-- Candidate withdrawals keep application history without exposing technical deletes.
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

-- Migrate legacy status values before applying the new constraint.
UPDATE public.applications SET status = 'accepted' WHERE status = 'hired';

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending','viewed','contacted','accepted','rejected','withdrawn'));

-- Candidates can withdraw only their own applications.
DROP POLICY IF EXISTS "Candidate withdraw own apps" ON public.applications;
CREATE POLICY "Candidate withdraw own apps"
ON public.applications
FOR UPDATE TO authenticated
USING (candidate_id = auth.uid())
WITH CHECK (candidate_id = auth.uid() AND status = 'withdrawn');

-- Notification delete support for candidate inbox management.
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
ON public.notifications
FOR DELETE TO authenticated
USING (recipient_id = auth.uid());

GRANT DELETE ON public.notifications TO authenticated;

-- Remove legacy overly-permissive public read policies left by earlier migrations.
DROP POLICY IF EXISTS "Public read candidates" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Public read education" ON public.education;
DROP POLICY IF EXISTS "Public read experience" ON public.experience;
DROP POLICY IF EXISTS "Public read skills" ON public.skills;
DROP POLICY IF EXISTS "Public read certifications" ON public.certifications;
DROP POLICY IF EXISTS "Public read services" ON public.services;
DROP POLICY IF EXISTS "Public read languages" ON public.languages;

-- Remove stale underscore bucket policies from migration 033 if they were applied.
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to manage their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to manage their own CV" ON storage.objects;

CREATE POLICY "Allow public read access to candidate avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'candidate-avatars');

CREATE POLICY "Allow owner to manage candidate avatar"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'candidate-avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid)
WITH CHECK (bucket_id = 'candidate-avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Allow owner to manage candidate CV"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'candidate-cvs' AND auth.uid() = (storage.foldername(name))[1]::uuid)
WITH CHECK (bucket_id = 'candidate-cvs' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- Final FTS function after candidate subtables have user_id columns.
CREATE OR REPLACE FUNCTION public.update_candidate_profiles_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  skills_text text;
  experience_text text;
  education_text text;
  languages_text text;
BEGIN
  SELECT string_agg(s.name, ' ') INTO skills_text
  FROM public.skills s
  WHERE s.user_id = NEW.user_id;

  SELECT string_agg(concat_ws(' ', e.position, e.company, e.description), ' ') INTO experience_text
  FROM public.experience e
  WHERE e.user_id = NEW.user_id;

  SELECT string_agg(concat_ws(' ', ed.institution, ed.program, ed.grade), ' ') INTO education_text
  FROM public.education ed
  WHERE ed.user_id = NEW.user_id;

  SELECT string_agg(l.language, ' ') INTO languages_text
  FROM public.languages l
  WHERE l.user_id = NEW.user_id;

  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.headline, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.about, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.city, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(skills_text, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(experience_text, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(education_text, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(languages_text, '')), 'C');

  RETURN NEW;
END;
$$;

UPDATE public.candidate_profiles SET user_id = user_id;
