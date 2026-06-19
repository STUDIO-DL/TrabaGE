-- =============================================
-- 022_job_recommendations.sql
-- Job matching cache, notification prefs, analytics
-- =============================================

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notification_frequency TEXT NOT NULL DEFAULT 'instant'
    CHECK (notification_frequency IN ('instant', 'daily', 'weekly'));

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_notifications
  ON public.candidate_profiles (notifications_enabled, notification_frequency)
  WHERE notifications_enabled = TRUE;

-- Cached match scores (AI-ready: score can be replaced by ML model output later)
CREATE TABLE IF NOT EXISTS public.job_matches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id     UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  score      SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_matches_user_score
  ON public.job_matches (user_id, score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_matches_job_score
  ON public.job_matches (job_id, score DESC);

ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own job matches" ON public.job_matches
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages job matches" ON public.job_matches
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT ON public.job_matches TO authenticated;
GRANT ALL ON public.job_matches TO service_role;

-- Recommendation analytics (notification sent/opened, job viewed, application submitted)
CREATE TABLE IF NOT EXISTS public.recommendation_analytics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id     UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'notification_sent',
    'notification_opened',
    'job_viewed',
    'application_submitted'
  )),
  metadata   JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_analytics_user
  ON public.recommendation_analytics (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_analytics_job
  ON public.recommendation_analytics (job_id, event_type, created_at DESC);

ALTER TABLE public.recommendation_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own analytics" ON public.recommendation_analytics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own analytics" ON public.recommendation_analytics
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages analytics" ON public.recommendation_analytics
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT, INSERT ON public.recommendation_analytics TO authenticated;
GRANT ALL ON public.recommendation_analytics TO service_role;

-- Upsert cached match score
CREATE OR REPLACE FUNCTION public.upsert_job_match(
  p_user_id UUID,
  p_job_id UUID,
  p_score SMALLINT
)
RETURNS public.job_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.job_matches;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.job_matches (user_id, job_id, score)
  VALUES (p_user_id, p_job_id, p_score)
  ON CONFLICT (user_id, job_id)
  DO UPDATE SET score = EXCLUDED.score, created_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_job_match(UUID, UUID, SMALLINT) TO authenticated, service_role;

-- Record analytics event (callable from client and edge functions)
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
  INSERT INTO public.recommendation_analytics (user_id, job_id, event_type, metadata)
  VALUES (p_user_id, p_job_id, p_event_type, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_recommendation_event(UUID, UUID, TEXT, JSONB) TO authenticated, service_role;

-- Notify matching candidates when a job is published (called by company owner)
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
  v_link TEXT;
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

    INSERT INTO public.notifications (recipient_id, type, title, body, metadata)
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
      )
    );

    v_in_app_count := v_in_app_count + 1;

    PERFORM public.track_recommendation_event(
      v_user_id,
      p_job_id,
      'notification_sent',
      jsonb_build_object('score', v_score, 'frequency', v_frequency)
    );

    IF v_frequency = 'instant' THEN
      v_push_recipients := array_append(v_push_recipients, v_user_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'in_app_count', v_in_app_count,
    'push_recipient_ids', to_jsonb(v_push_recipients)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_job_recommendations(UUID, JSONB) TO authenticated, service_role;
