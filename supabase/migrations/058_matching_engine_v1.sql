-- =============================================
-- 058_matching_engine_v1.sql
-- Matching engine v1: candidate↔job cache, availability signals, recalc RPCs.
-- Scores are internal only (never shown in UI).
-- =============================================

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS province TEXT;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS availability_required TEXT
    CHECK (
      availability_required IS NULL
      OR availability_required IN ('immediate', '30_days', 'flexible')
    );

UPDATE public.jobs
SET availability_required = 'flexible'
WHERE availability_required IS NULL;

CREATE INDEX IF NOT EXISTS candidate_profiles_province_idx
  ON public.candidate_profiles (province)
  WHERE province IS NOT NULL;

CREATE INDEX IF NOT EXISTS jobs_province_idx
  ON public.jobs (province)
  WHERE province IS NOT NULL;

CREATE INDEX IF NOT EXISTS jobs_availability_required_idx
  ON public.jobs (availability_required)
  WHERE availability_required IS NOT NULL;

-- Company-side cache: ranked candidates per job (internal score).
CREATE TABLE IF NOT EXISTS public.job_candidate_matches (
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS job_candidate_matches_job_score_idx
  ON public.job_candidate_matches (job_id, score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS job_candidate_matches_candidate_idx
  ON public.job_candidate_matches (candidate_id, score DESC);

ALTER TABLE public.job_candidate_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies read job candidate matches" ON public.job_candidate_matches;
CREATE POLICY "Companies read job candidate matches"
ON public.job_candidate_matches FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_candidate_matches.job_id
      AND j.company_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Candidates read own job candidate matches" ON public.job_candidate_matches;
CREATE POLICY "Candidates read own job candidate matches"
ON public.job_candidate_matches FOR SELECT TO authenticated
USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages job candidate matches" ON public.job_candidate_matches;
CREATE POLICY "Service role manages job candidate matches"
ON public.job_candidate_matches FOR ALL TO service_role
USING (TRUE)
WITH CHECK (TRUE);

GRANT SELECT ON public.job_candidate_matches TO authenticated;
GRANT ALL ON public.job_candidate_matches TO service_role;

-- Batch upsert for company-side candidate rankings.
CREATE OR REPLACE FUNCTION public.upsert_job_candidate_matches(p_matches JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  INSERT INTO public.job_candidate_matches (job_id, candidate_id, score)
  SELECT
    (item->>'job_id')::UUID,
    (item->>'candidate_id')::UUID,
    (item->>'score')::SMALLINT
  FROM jsonb_array_elements(COALESCE(p_matches, '[]'::jsonb)) item
  WHERE (item->>'job_id') IS NOT NULL
    AND (item->>'candidate_id') IS NOT NULL
    AND (item->>'score') IS NOT NULL
  ON CONFLICT (job_id, candidate_id)
  DO UPDATE SET score = EXCLUDED.score, created_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_job_candidate_matches(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_job_candidate_matches(JSONB) TO service_role;

-- Read cached job recommendations for a candidate (newest scores first).
CREATE OR REPLACE FUNCTION public.get_ranked_jobs_for_candidate(
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_min_score INT DEFAULT 1
)
RETURNS TABLE (
  job_id UUID,
  score SMALLINT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jm.job_id, jm.score, jm.created_at
  FROM public.job_matches jm
  INNER JOIN public.jobs j ON j.id = jm.job_id
  WHERE jm.user_id = p_user_id
    AND jm.score >= p_min_score
    AND j.status = 'active'
    AND COALESCE(j.admin_hidden, FALSE) = FALSE
    AND (
      auth.uid() IS NULL
      OR auth.uid() = p_user_id
    )
  ORDER BY jm.score DESC, jm.created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_ranked_jobs_for_candidate(UUID, INT, INT) TO authenticated, service_role;

-- Read cached candidate rankings for a company job.
CREATE OR REPLACE FUNCTION public.get_ranked_candidates_for_job(
  p_job_id UUID,
  p_limit INT DEFAULT 50,
  p_min_score INT DEFAULT 1
)
RETURNS TABLE (
  candidate_id UUID,
  score SMALLINT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jcm.candidate_id, jcm.score, jcm.created_at
  FROM public.job_candidate_matches jcm
  INNER JOIN public.jobs j ON j.id = jcm.job_id
  WHERE jcm.job_id = p_job_id
    AND jcm.score >= p_min_score
    AND (
      auth.uid() IS NULL
      OR j.company_id = auth.uid()
    )
  ORDER BY jcm.score DESC, jcm.created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_ranked_candidates_for_job(UUID, INT, INT) TO authenticated, service_role;

-- Claim pending recalc events for background workers (service role).
CREATE OR REPLACE FUNCTION public.claim_recommendation_recalc_batch(p_limit INT DEFAULT 25)
RETURNS SETOF public.recommendation_recalc_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.recommendation_recalc_events e
  SET processed_at = NOW()
  WHERE e.id IN (
    SELECT id
    FROM public.recommendation_recalc_events
    WHERE processed_at IS NULL
    ORDER BY created_at ASC
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING e.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_recommendation_recalc_batch(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_recommendation_recalc_batch(INT) TO service_role;

-- Re-enqueue when job status changes (active ↔ inactive).
CREATE OR REPLACE FUNCTION public.enqueue_job_status_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.enqueue_recommendation_recalc(
      'job',
      NEW.id,
      'job_status_changed',
      'jobs',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recommendation_job_status_changed ON public.jobs;
CREATE TRIGGER recommendation_job_status_changed
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_job_status_recalc();

COMMENT ON TABLE public.job_candidate_matches IS
  'Internal candidate↔job relevance cache for company views. Scores are never shown in UI.';

COMMENT ON FUNCTION public.get_ranked_jobs_for_candidate IS
  'Returns cached job matches for a candidate ordered by internal relevance score.';

COMMENT ON FUNCTION public.get_ranked_candidates_for_job IS
  'Returns cached candidate matches for a job ordered by internal relevance score.';
