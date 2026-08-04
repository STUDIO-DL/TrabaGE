-- =============================================
-- 135_user_shared_opportunities.sql
-- Personal users can publish shared job opportunities
-- alongside official company offers (source_type).
-- =============================================

-- 1. Columns
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS shared_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS contact_method TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_source_type_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_source_type_check
  CHECK (source_type IN ('company', 'user'));

-- Allow null company_id for user-shared opportunities only.
ALTER TABLE public.jobs
  ALTER COLUMN company_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_shared_by_user_id_fkey'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_shared_by_user_id_fkey
      FOREIGN KEY (shared_by_user_id)
      REFERENCES public.candidate_profiles(user_id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_source_integrity;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_source_integrity CHECK (
    (
      source_type = 'company'
      AND company_id IS NOT NULL
      AND shared_by_user_id IS NULL
    )
    OR (
      source_type = 'user'
      AND company_id IS NULL
      AND shared_by_user_id IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_jobs_source_type_status
  ON public.jobs (source_type, status, created_at DESC)
  WHERE coalesce(admin_hidden, false) = false;

CREATE INDEX IF NOT EXISTS idx_jobs_shared_by_user_id
  ON public.jobs (shared_by_user_id, created_at DESC)
  WHERE source_type = 'user';

-- 2. Company publish guard: skip user-shared rows
CREATE OR REPLACE FUNCTION public.enforce_company_setup_before_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_setup_complete BOOLEAN;
BEGIN
  IF NEW.status = 'active' AND coalesce(NEW.source_type, 'company') = 'company' THEN
    SELECT setup_complete
    INTO v_setup_complete
    FROM public.company_profiles
    WHERE user_id = NEW.company_id;

    IF COALESCE(v_setup_complete, false) = false THEN
      RAISE EXCEPTION 'Completa el perfil de tu empresa antes de publicar ofertas';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Profile completeness gate for user-shared opportunities
CREATE OR REPLACE FUNCTION public.enforce_shared_opportunity_profile_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_full_name TEXT;
  v_about TEXT;
  v_avatar_path TEXT;
BEGIN
  IF NEW.source_type <> 'user' THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT full_name, about, avatar_path
  INTO v_full_name, v_about, v_avatar_path
  FROM public.candidate_profiles
  WHERE user_id = NEW.shared_by_user_id;

  IF v_full_name IS NULL OR length(trim(v_full_name)) = 0
     OR v_about IS NULL OR length(trim(v_about)) = 0
     OR v_avatar_path IS NULL OR length(trim(v_avatar_path)) = 0 THEN
    RAISE EXCEPTION 'Completa tu perfil (foto, nombre y Sobre mí) antes de publicar oportunidades';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_shared_opportunity_profile_complete_trigger ON public.jobs;
CREATE TRIGGER enforce_shared_opportunity_profile_complete_trigger
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_shared_opportunity_profile_complete();

-- 4. RLS: public read includes user-shared opportunities from active candidates
DROP POLICY IF EXISTS "Jobs are publicly viewable" ON public.jobs;
CREATE POLICY "Jobs are publicly viewable"
ON public.jobs FOR SELECT
USING (
  status = 'active'
  AND coalesce(admin_hidden, false) = false
  AND (
    (
      coalesce(source_type, 'company') = 'company'
      AND company_id IS NOT NULL
      AND public.is_active_company(company_id)
    )
    OR (
      source_type = 'user'
      AND shared_by_user_id IS NOT NULL
      AND public.is_active_candidate(shared_by_user_id)
    )
  )
);

-- 5. Personal users manage their own shared opportunities
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

-- Keep company manage policy scoped to company rows (null company_id must not match)
DROP POLICY IF EXISTS "Companies can manage their own jobs" ON public.jobs;
CREATE POLICY "Companies can manage their own jobs"
ON public.jobs FOR ALL TO authenticated
USING (
  coalesce(source_type, 'company') = 'company'
  AND company_id IS NOT NULL
  AND auth.uid() = company_id
  AND public.is_active_company(auth.uid())
)
WITH CHECK (
  coalesce(source_type, 'company') = 'company'
  AND company_id IS NOT NULL
  AND auth.uid() = company_id
  AND shared_by_user_id IS NULL
  AND public.is_active_company(auth.uid())
);

-- 6. Applications only against official company offers
DROP POLICY IF EXISTS "Candidate insert app" ON public.applications;
CREATE POLICY "Candidate insert app" ON public.applications
FOR INSERT TO authenticated
WITH CHECK (
  candidate_id = auth.uid()
  AND public.is_active_candidate(auth.uid())
  AND cv_path LIKE auth.uid()::text || '/%'
  AND EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_id
      AND j.status = 'active'
      AND coalesce(j.admin_hidden, false) = false
      AND coalesce(j.source_type, 'company') = 'company'
      AND j.company_id IS NOT NULL
      AND public.is_active_company(j.company_id)
  )
);
