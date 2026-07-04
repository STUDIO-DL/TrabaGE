-- =============================================
-- 041_recommendation_algorithm_optimization.sql
-- Deterministic recommendation signals, indexes, dedupe and recalc events.
-- =============================================

-- Candidate signals used by the rule-based matcher.
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Guinea Ecuatorial',
  ADD COLUMN IF NOT EXISTS expected_salary NUMERIC;

-- Job internal profile. Existing UI can keep inferring these from text; future
-- admin/import flows can fill them directly without schema changes.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS required_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS experience_level TEXT
    CHECK (experience_level IS NULL OR experience_level IN ('none', 'junior', 'mid', 'senior')),
  ADD COLUMN IF NOT EXISTS education_level TEXT
    CHECK (education_level IS NULL OR education_level IN ('secondary', 'technical', 'degree', 'master')),
  ADD COLUMN IF NOT EXISTS required_languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Guinea Ecuatorial';

CREATE INDEX IF NOT EXISTS candidate_profiles_location_idx
  ON public.candidate_profiles (country, city);

CREATE INDEX IF NOT EXISTS candidate_profiles_expected_salary_idx
  ON public.candidate_profiles (expected_salary)
  WHERE expected_salary IS NOT NULL;

CREATE INDEX IF NOT EXISTS jobs_recommendation_lookup_idx
  ON public.jobs (status, admin_hidden, country, city, work_mode, job_type, created_at DESC);

CREATE INDEX IF NOT EXISTS jobs_required_skills_gin_idx
  ON public.jobs USING gin (required_skills);

CREATE INDEX IF NOT EXISTS jobs_required_languages_gin_idx
  ON public.jobs USING gin (required_languages);

CREATE INDEX IF NOT EXISTS follows_user_target_idx
  ON public.follows (user_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS applications_candidate_job_idx
  ON public.applications (candidate_id, job_id, applied_at DESC);

-- Notification deduplication for automatic recommendation/followed-company events.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup_key_unique_idx
  ON public.notifications (dedup_key)
  WHERE dedup_key IS NOT NULL;

-- Remove legacy overly broad candidate subtable reads that can survive older migrations.
DROP POLICY IF EXISTS "Public read certs" ON public.certifications;

-- Keep candidate FTS compatible with the actual languages.language column.
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
    setweight(to_tsvector('spanish', coalesce(NEW.country, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(skills_text, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(experience_text, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(education_text, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(languages_text, '')), 'C');

  RETURN NEW;
END;
$$;

UPDATE public.candidate_profiles SET user_id = user_id;

-- Recalc event log: deterministic and deduplicated, usable by future workers.
CREATE TABLE IF NOT EXISTS public.recommendation_recalc_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('candidate', 'job', 'company')),
  subject_id UUID NOT NULL,
  reason TEXT NOT NULL,
  source_table TEXT,
  source_id UUID,
  dedup_key TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recommendation_recalc_pending_idx
  ON public.recommendation_recalc_events (processed_at, created_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.recommendation_recalc_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages recommendation recalc events" ON public.recommendation_recalc_events;
CREATE POLICY "Service role manages recommendation recalc events"
ON public.recommendation_recalc_events FOR ALL TO service_role
USING (TRUE)
WITH CHECK (TRUE);

GRANT ALL ON public.recommendation_recalc_events TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_recommendation_recalc(
  p_subject_type TEXT,
  p_subject_id UUID,
  p_reason TEXT,
  p_source_table TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedup_key TEXT;
BEGIN
  v_dedup_key := concat_ws(':', p_subject_type, p_subject_id::TEXT, p_reason, coalesce(p_source_table, ''), coalesce(p_source_id::TEXT, ''));

  INSERT INTO public.recommendation_recalc_events (
    subject_type,
    subject_id,
    reason,
    source_table,
    source_id,
    dedup_key
  )
  VALUES (
    p_subject_type,
    p_subject_id,
    p_reason,
    p_source_table,
    p_source_id,
    v_dedup_key
  )
  ON CONFLICT (dedup_key) DO UPDATE
  SET created_at = NOW(),
      processed_at = NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_recommendation_recalc(TEXT, UUID, TEXT, TEXT, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enqueue_candidate_profile_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_source_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_source_id := OLD.id;
  ELSE
    v_user_id := NEW.user_id;
    v_source_id := NEW.id;
  END IF;

  PERFORM public.enqueue_recommendation_recalc(
    'candidate',
    v_user_id,
    TG_TABLE_NAME || '_changed',
    TG_TABLE_NAME,
    v_source_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_candidate_row_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.enqueue_recommendation_recalc(
      'candidate',
      OLD.user_id,
      'profile_changed',
      TG_TABLE_NAME,
      OLD.user_id
    );

    RETURN OLD;
  END IF;

  PERFORM public.enqueue_recommendation_recalc(
    'candidate',
    NEW.user_id,
    'profile_changed',
    TG_TABLE_NAME,
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recommendation_candidate_profile_changed ON public.candidate_profiles;
CREATE TRIGGER recommendation_candidate_profile_changed
  AFTER INSERT OR UPDATE ON public.candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_candidate_row_recalc();

DROP TRIGGER IF EXISTS recommendation_skills_changed ON public.skills;
CREATE TRIGGER recommendation_skills_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_candidate_profile_recalc();

DROP TRIGGER IF EXISTS recommendation_experience_changed ON public.experience;
CREATE TRIGGER recommendation_experience_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.experience
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_candidate_profile_recalc();

DROP TRIGGER IF EXISTS recommendation_education_changed ON public.education;
CREATE TRIGGER recommendation_education_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.education
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_candidate_profile_recalc();

DROP TRIGGER IF EXISTS recommendation_languages_changed ON public.languages;
CREATE TRIGGER recommendation_languages_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.languages
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_candidate_profile_recalc();

CREATE OR REPLACE FUNCTION public.enqueue_job_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM public.enqueue_recommendation_recalc(
      'job',
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN 'job_published' ELSE 'job_updated' END,
      'jobs',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recommendation_job_changed ON public.jobs;
CREATE TRIGGER recommendation_job_changed
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_job_recalc();

-- Deduplicated follower notifications for followed-company events.
CREATE OR REPLACE FUNCTION public.notify_followers(
  p_target_type TEXT,
  p_target_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_ids UUID[];
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_target_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH inserted AS (
    INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
    SELECT
      f.user_id,
      p_type,
      p_title,
      p_body,
      p_metadata,
      md5(concat_ws(':', f.user_id::TEXT, p_type, p_target_type, p_target_id::TEXT, coalesce(p_title, ''), coalesce(p_body, ''), coalesce(p_metadata::TEXT, '')))
    FROM public.follows f
    WHERE f.target_type = p_target_type
      AND f.target_id = p_target_id
    ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
    RETURNING recipient_id
  )
  SELECT COALESCE(ARRAY_AGG(recipient_id), ARRAY[]::UUID[])
  INTO v_recipient_ids
  FROM inserted;

  RETURN v_recipient_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_followers(TEXT, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.track_recommendation_event(
  p_user_id UUID,
  p_job_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.recommendation_analytics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.recommendation_analytics;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.recommendation_analytics (user_id, job_id, event_type, metadata)
  VALUES (p_user_id, p_job_id, p_event_type, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_recommendation_event(UUID, UUID, TEXT, JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.upsert_job_matches(
  p_matches JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  INSERT INTO public.job_matches (user_id, job_id, score)
  SELECT
    (item->>'user_id')::UUID,
    (item->>'job_id')::UUID,
    (item->>'score')::SMALLINT
  FROM jsonb_array_elements(COALESCE(p_matches, '[]'::jsonb)) item
  WHERE (item->>'user_id') IS NOT NULL
    AND (item->>'job_id') IS NOT NULL
    AND (item->>'score') IS NOT NULL
    AND (
      auth.uid() IS NULL
      OR auth.uid() = (item->>'user_id')::UUID
    )
  ON CONFLICT (user_id, job_id)
  DO UPDATE SET score = EXCLUDED.score, created_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_job_matches(JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notify_job_recommendations(
  p_job_id UUID,
  p_matches JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs;
  v_company_id UUID;
  v_match JSONB;
  v_user_id UUID;
  v_score INT;
  v_frequency TEXT;
  v_push_recipients UUID[] := ARRAY[]::UUID[];
  v_in_app_count INT := 0;
  v_inserted_count INT := 0;
  v_link TEXT;
  v_dedup_key TEXT;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  v_company_id := v_job.company_id;
  IF auth.uid() IS NOT NULL AND auth.uid() != v_company_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_link := '/candidate/jobs/' || p_job_id::TEXT;

  FOR v_match IN SELECT * FROM jsonb_array_elements(COALESCE(p_matches, '[]'::jsonb))
  LOOP
    v_user_id := (v_match->>'user_id')::UUID;
    v_score := (v_match->>'score')::INT;

    IF v_user_id IS NULL OR v_score IS NULL OR v_score < 70 THEN
      CONTINUE;
    END IF;

    PERFORM public.upsert_job_match(v_user_id, p_job_id, v_score::SMALLINT);

    SELECT cp.notification_frequency INTO v_frequency
    FROM public.candidate_profiles cp
    WHERE cp.user_id = v_user_id
      AND cp.notifications_enabled = TRUE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_dedup_key := 'job_recommendation:' || v_user_id::TEXT || ':' || p_job_id::TEXT;

    INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
    VALUES (
      v_user_id,
      'job_recommendation',
      'Nueva oferta para ti',
      'La oferta "' || v_job.title || '" coincide con tu perfil.',
      jsonb_build_object(
        'link', v_link,
        'job_id', p_job_id,
        'score', v_score,
        'frequency', v_frequency
      ),
      v_dedup_key
    )
    ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    v_in_app_count := v_in_app_count + v_inserted_count;

    PERFORM public.track_recommendation_event(
      v_user_id,
      p_job_id,
      'notification_sent',
      jsonb_build_object('score', v_score, 'frequency', v_frequency)
    );

    IF v_inserted_count > 0 AND v_frequency = 'instant' THEN
      v_push_recipients := array_append(v_push_recipients, v_user_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'in_app_count', v_in_app_count,
    'push_recipient_ids', to_jsonb(v_push_recipients)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_job_recommendations(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_job_recommendations(UUID, JSONB) TO service_role;
