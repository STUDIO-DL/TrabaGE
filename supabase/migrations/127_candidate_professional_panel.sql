-- =============================================
-- 127_candidate_professional_panel.sql
-- Owner-only professional analytics for personal
-- profiles: profile/post views + interaction aggregates.
-- =============================================

CREATE TABLE IF NOT EXISTS public.candidate_analytics_events (
  id BIGSERIAL PRIMARY KEY,
  profile_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('profile_view', 'post_view')),
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS candidate_analytics_events_profile_created_idx
  ON public.candidate_analytics_events (profile_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS candidate_analytics_events_profile_type_created_idx
  ON public.candidate_analytics_events (profile_user_id, event_type, created_at DESC);

ALTER TABLE public.candidate_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct select candidate analytics events"
  ON public.candidate_analytics_events;
CREATE POLICY "No direct select candidate analytics events"
  ON public.candidate_analytics_events
  FOR SELECT TO authenticated
  USING (FALSE);

DROP POLICY IF EXISTS "No direct insert candidate analytics events"
  ON public.candidate_analytics_events;
CREATE POLICY "No direct insert candidate analytics events"
  ON public.candidate_analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (FALSE);

REVOKE ALL ON public.candidate_analytics_events FROM PUBLIC;
GRANT SELECT, INSERT ON public.candidate_analytics_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.candidate_analytics_events_id_seq TO service_role;

-- ─── Track event ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.track_candidate_analytics_event(
  p_profile_user_id UUID,
  p_event_type TEXT,
  p_post_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_type TEXT := lower(trim(coalesce(p_event_type, '')));
  v_exists BOOLEAN;
  v_post_author UUID;
  v_recent INT;
BEGIN
  IF p_profile_user_id IS NULL THEN
    RAISE EXCEPTION 'Perfil inválido';
  END IF;

  IF v_type NOT IN ('profile_view', 'post_view') THEN
    RAISE EXCEPTION 'Tipo de evento inválido';
  END IF;

  -- Never count self-views.
  IF v_actor IS NOT NULL AND v_actor = p_profile_user_id THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = p_profile_user_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN;
  END IF;

  IF p_post_id IS NOT NULL THEN
    SELECT p.author_id INTO v_post_author FROM public.posts p WHERE p.id = p_post_id;
    IF v_post_author IS NULL OR v_post_author <> p_profile_user_id THEN
      RAISE EXCEPTION 'Publicación inválida';
    END IF;
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_recent
    FROM public.candidate_analytics_events e
    WHERE e.profile_user_id = p_profile_user_id
      AND e.actor_id = v_actor
      AND e.event_type = v_type
      AND e.created_at > NOW() - INTERVAL '1 minute';

    IF v_recent >= 30 THEN
      RETURN;
    END IF;
  END IF;

  IF v_actor IS NOT NULL AND v_type IN ('profile_view', 'post_view') THEN
    IF EXISTS (
      SELECT 1
      FROM public.candidate_analytics_events e
      WHERE e.profile_user_id = p_profile_user_id
        AND e.actor_id = v_actor
        AND e.event_type = v_type
        AND e.created_at > NOW() - INTERVAL '1 hour'
        AND (p_post_id IS NULL OR e.post_id IS NOT DISTINCT FROM p_post_id)
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.candidate_analytics_events (
    profile_user_id, actor_id, event_type, post_id, metadata
  ) VALUES (
    p_profile_user_id,
    v_actor,
    v_type,
    p_post_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.track_candidate_analytics_event(UUID, TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_candidate_analytics_event(UUID, TEXT, UUID, JSONB)
  TO anon, authenticated, service_role;

-- ─── Owner-only bundle ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_candidate_professional_panel(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_to TIMESTAMPTZ := coalesce(p_to, NOW());
  v_from TIMESTAMPTZ;
  v_prev_from TIMESTAMPTZ;
  v_prev_to TIMESTAMPTZ;
  v_duration INTERVAL;
  v_profile_views INT := 0;
  v_post_views INT := 0;
  v_likes INT := 0;
  v_comments INT := 0;
  v_reposts INT := 0;
  v_interactions INT := 0;
  v_prev_profile_views INT := 0;
  v_prev_interactions INT := 0;
  v_prev_total NUMERIC;
  v_curr_total NUMERIC;
  v_growth NUMERIC;
  v_series JSONB := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  v_from := coalesce(p_from, v_to - INTERVAL '30 days');
  IF v_from >= v_to THEN
    v_from := v_to - INTERVAL '30 days';
  END IF;

  v_duration := v_to - v_from;
  v_prev_to := v_from;
  v_prev_from := v_from - v_duration;

  SELECT COUNT(*)::INT INTO v_profile_views
  FROM public.candidate_analytics_events e
  WHERE e.profile_user_id = v_uid
    AND e.event_type = 'profile_view'
    AND e.created_at >= v_from
    AND e.created_at < v_to;

  SELECT COUNT(*)::INT INTO v_post_views
  FROM public.candidate_analytics_events e
  WHERE e.profile_user_id = v_uid
    AND e.event_type = 'post_view'
    AND e.created_at >= v_from
    AND e.created_at < v_to;

  SELECT COUNT(*)::INT INTO v_likes
  FROM public.post_likes pl
  INNER JOIN public.posts p ON p.id = pl.post_id
  WHERE p.author_id = v_uid
    AND pl.user_id IS DISTINCT FROM v_uid
    AND pl.created_at >= v_from
    AND pl.created_at < v_to;

  SELECT COUNT(*)::INT INTO v_comments
  FROM public.post_comments c
  INNER JOIN public.posts p ON p.id = c.post_id
  WHERE p.author_id = v_uid
    AND c.author_id IS DISTINCT FROM v_uid
    AND coalesce(c.is_hidden, FALSE) = FALSE
    AND c.created_at >= v_from
    AND c.created_at < v_to;

  SELECT COUNT(*)::INT INTO v_reposts
  FROM public.post_reposts r
  INNER JOIN public.posts p ON p.id = r.post_id
  WHERE p.author_id = v_uid
    AND r.user_id IS DISTINCT FROM v_uid
    AND r.created_at >= v_from
    AND r.created_at < v_to;

  v_interactions := coalesce(v_likes, 0) + coalesce(v_comments, 0) + coalesce(v_reposts, 0);

  SELECT COUNT(*)::INT INTO v_prev_profile_views
  FROM public.candidate_analytics_events e
  WHERE e.profile_user_id = v_uid
    AND e.event_type = 'profile_view'
    AND e.created_at >= v_prev_from
    AND e.created_at < v_prev_to;

  SELECT (
    (
      SELECT COUNT(*)::INT
      FROM public.post_likes pl
      INNER JOIN public.posts p ON p.id = pl.post_id
      WHERE p.author_id = v_uid
        AND pl.user_id IS DISTINCT FROM v_uid
        AND pl.created_at >= v_prev_from
        AND pl.created_at < v_prev_to
    )
    +
    (
      SELECT COUNT(*)::INT
      FROM public.post_comments c
      INNER JOIN public.posts p ON p.id = c.post_id
      WHERE p.author_id = v_uid
        AND c.author_id IS DISTINCT FROM v_uid
        AND coalesce(c.is_hidden, FALSE) = FALSE
        AND c.created_at >= v_prev_from
        AND c.created_at < v_prev_to
    )
    +
    (
      SELECT COUNT(*)::INT
      FROM public.post_reposts r
      INNER JOIN public.posts p ON p.id = r.post_id
      WHERE p.author_id = v_uid
        AND r.user_id IS DISTINCT FROM v_uid
        AND r.created_at >= v_prev_from
        AND r.created_at < v_prev_to
    )
  ) INTO v_prev_interactions;

  v_curr_total := coalesce(v_profile_views, 0) + coalesce(v_interactions, 0);
  v_prev_total := coalesce(v_prev_profile_views, 0) + coalesce(v_prev_interactions, 0);

  IF v_prev_total > 0 THEN
    v_growth := ROUND(((v_curr_total - v_prev_total) / v_prev_total) * 100);
  ELSE
    v_growth := NULL;
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'profile_views', coalesce(pv.cnt, 0),
        'interactions', coalesce(ix.cnt, 0)
      )
      ORDER BY d.day
    ),
    '[]'::jsonb
  )
  INTO v_series
  FROM generate_series(
    date_trunc('day', v_from),
    date_trunc('day', v_to - INTERVAL '1 second'),
    INTERVAL '1 day'
  ) AS d(day)
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS cnt
    FROM public.candidate_analytics_events e
    WHERE e.profile_user_id = v_uid
      AND e.event_type = 'profile_view'
      AND e.created_at >= d.day
      AND e.created_at < d.day + INTERVAL '1 day'
  ) pv ON TRUE
  LEFT JOIN LATERAL (
    SELECT (
      (
        SELECT COUNT(*)::INT
        FROM public.post_likes pl
        INNER JOIN public.posts p ON p.id = pl.post_id
        WHERE p.author_id = v_uid
          AND pl.user_id IS DISTINCT FROM v_uid
          AND pl.created_at >= d.day
          AND pl.created_at < d.day + INTERVAL '1 day'
      )
      +
      (
        SELECT COUNT(*)::INT
        FROM public.post_comments c
        INNER JOIN public.posts p ON p.id = c.post_id
        WHERE p.author_id = v_uid
          AND c.author_id IS DISTINCT FROM v_uid
          AND coalesce(c.is_hidden, FALSE) = FALSE
          AND c.created_at >= d.day
          AND c.created_at < d.day + INTERVAL '1 day'
      )
      +
      (
        SELECT COUNT(*)::INT
        FROM public.post_reposts r
        INNER JOIN public.posts p ON p.id = r.post_id
        WHERE p.author_id = v_uid
          AND r.user_id IS DISTINCT FROM v_uid
          AND r.created_at >= d.day
          AND r.created_at < d.day + INTERVAL '1 day'
      )
    ) AS cnt
  ) ix ON TRUE;

  RETURN jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'summary', jsonb_build_object(
      'profile_views', coalesce(v_profile_views, 0),
      'post_views', coalesce(v_post_views, 0),
      'likes', coalesce(v_likes, 0),
      'comments', coalesce(v_comments, 0),
      'reposts', coalesce(v_reposts, 0),
      'interactions', coalesce(v_interactions, 0),
      'growth_pct', v_growth
    ),
    'series', coalesce(v_series, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_candidate_professional_panel(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_candidate_professional_panel(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_candidate_professional_panel IS
  'Owner-only professional panel metrics for personal profiles.';
