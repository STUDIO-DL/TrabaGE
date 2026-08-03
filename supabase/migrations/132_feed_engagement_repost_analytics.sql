-- 132: Feed engagement + in-app repost analytics
-- - post_repost event type for company analytics
-- - get_company_repost_analytics (count, reach, views via repost)
-- - candidate panel: repost_reach + views_from_reposts
-- - SQL feed scoring boost from likes/comments/reposts

-- ─── Company analytics: allow post_repost ───────────────────────────────────

ALTER TABLE public.company_analytics_events
  DROP CONSTRAINT IF EXISTS company_analytics_events_event_type_check;

ALTER TABLE public.company_analytics_events
  ADD CONSTRAINT company_analytics_events_event_type_check
  CHECK (event_type IN (
    'profile_view',
    'job_view',
    'website_click',
    'whatsapp_click',
    'email_click',
    'company_save',
    'company_unsave',
    'post_view',
    'post_like',
    'post_comment',
    'post_share',
    'post_repost',
    'post_save'
  ));

CREATE OR REPLACE FUNCTION public.track_company_analytics_event(
  p_company_id UUID,
  p_event_type TEXT,
  p_job_id UUID DEFAULT NULL,
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
  v_company_exists BOOLEAN;
  v_job_company UUID;
  v_post_author UUID;
  v_recent INT;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa inválida';
  END IF;

  IF v_type NOT IN (
    'profile_view', 'job_view', 'website_click', 'whatsapp_click', 'email_click',
    'company_save', 'company_unsave', 'post_view', 'post_like', 'post_comment',
    'post_share', 'post_repost', 'post_save'
  ) THEN
    RAISE EXCEPTION 'Tipo de evento inválido';
  END IF;

  -- Do not count self-views / self-clicks.
  IF v_actor IS NOT NULL AND v_actor = p_company_id THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.company_profiles cp WHERE cp.user_id = p_company_id
  ) INTO v_company_exists;

  IF NOT v_company_exists THEN
    RAISE EXCEPTION 'Empresa no encontrada';
  END IF;

  IF p_job_id IS NOT NULL THEN
    SELECT j.company_id INTO v_job_company FROM public.jobs j WHERE j.id = p_job_id;
    IF v_job_company IS NULL OR v_job_company <> p_company_id THEN
      RAISE EXCEPTION 'Oferta inválida';
    END IF;
  END IF;

  IF p_post_id IS NOT NULL THEN
    SELECT p.author_id INTO v_post_author FROM public.posts p WHERE p.id = p_post_id;
    IF v_post_author IS NULL OR v_post_author <> p_company_id THEN
      RAISE EXCEPTION 'Publicación inválida';
    END IF;
  END IF;

  -- Soft rate limit: max 30 events per actor+company+type per minute.
  IF v_actor IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_recent
    FROM public.company_analytics_events e
    WHERE e.company_id = p_company_id
      AND e.actor_id = v_actor
      AND e.event_type = v_type
      AND e.created_at > NOW() - INTERVAL '1 minute';

    IF v_recent >= 30 THEN
      RETURN;
    END IF;
  END IF;

  -- Deduplicate noisy views: one profile/job/post view per actor per hour.
  IF v_actor IS NOT NULL AND v_type IN ('profile_view', 'job_view', 'post_view') THEN
    IF EXISTS (
      SELECT 1
      FROM public.company_analytics_events e
      WHERE e.company_id = p_company_id
        AND e.actor_id = v_actor
        AND e.event_type = v_type
        AND e.created_at > NOW() - INTERVAL '1 hour'
        AND (p_job_id IS NULL OR e.job_id IS NOT DISTINCT FROM p_job_id)
        AND (p_post_id IS NULL OR e.post_id IS NOT DISTINCT FROM p_post_id)
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.company_analytics_events (
    company_id, actor_id, event_type, job_id, post_id, metadata
  ) VALUES (
    p_company_id,
    v_actor,
    v_type,
    p_job_id,
    p_post_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.track_company_analytics_event(UUID, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_company_analytics_event(UUID, TEXT, UUID, UUID, JSONB)
  TO anon, authenticated, service_role;

-- ─── Company repost performance ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_company_repost_analytics(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id UUID := auth.uid();
  v_role TEXT;
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
  v_reposts INT := 0;
  v_reach INT := 0;
  v_views INT := 0;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  v_role := public.get_my_role();
  IF NOT public.is_employer_role(v_role) THEN
    RAISE EXCEPTION 'Solo cuentas de empresa u organización';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_profiles cp WHERE cp.user_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Perfil de empresa no encontrado';
  END IF;

  v_to := coalesce(p_to, NOW() + INTERVAL '1 day');
  v_from := coalesce(p_from, TIMESTAMPTZ '2000-01-01');
  IF v_to <= v_from THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;

  SELECT COUNT(*)::INT INTO v_reposts
  FROM public.post_reposts r
  INNER JOIN public.posts p ON p.id = r.post_id
  WHERE p.author_id = v_company_id
    AND r.user_id IS DISTINCT FROM v_company_id
    AND r.created_at >= v_from
    AND r.created_at < v_to;

  -- Estimated reach: unique followers of accounts that reposted the company's posts.
  SELECT COUNT(DISTINCT f.user_id)::INT INTO v_reach
  FROM public.post_reposts r
  INNER JOIN public.posts p ON p.id = r.post_id
  INNER JOIN public.follows f ON f.target_id = r.user_id
  WHERE p.author_id = v_company_id
    AND r.user_id IS DISTINCT FROM v_company_id
    AND r.created_at >= v_from
    AND r.created_at < v_to
    AND f.user_id IS DISTINCT FROM v_company_id
    AND f.target_type IN ('business', 'organization', 'company');

  SELECT COUNT(*)::INT INTO v_views
  FROM public.company_analytics_events e
  WHERE e.company_id = v_company_id
    AND e.event_type = 'post_view'
    AND e.created_at >= v_from
    AND e.created_at < v_to
    AND coalesce(e.metadata->>'via_repost', '') IN ('true', '1');

  RETURN jsonb_build_object(
    'reposts', coalesce(v_reposts, 0),
    'reach', coalesce(v_reach, 0),
    'views_from_reposts', coalesce(v_views, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_repost_analytics(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_repost_analytics(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-- ─── Candidate panel: repost reach + views via repost ───────────────────────

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
  v_repost_reach INT := 0;
  v_views_from_reposts INT := 0;
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

  SELECT COUNT(DISTINCT f.user_id)::INT INTO v_repost_reach
  FROM public.post_reposts r
  INNER JOIN public.posts p ON p.id = r.post_id
  INNER JOIN public.follows f ON f.target_id = r.user_id
  WHERE p.author_id = v_uid
    AND r.user_id IS DISTINCT FROM v_uid
    AND r.created_at >= v_from
    AND r.created_at < v_to
    AND f.user_id IS DISTINCT FROM v_uid
    AND f.target_type IN ('business', 'organization', 'company');

  SELECT COUNT(*)::INT INTO v_views_from_reposts
  FROM public.candidate_analytics_events e
  WHERE e.profile_user_id = v_uid
    AND e.event_type = 'post_view'
    AND e.created_at >= v_from
    AND e.created_at < v_to
    AND coalesce(e.metadata->>'via_repost', '') IN ('true', '1');

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

  v_prev_total := coalesce(v_prev_profile_views, 0) + coalesce(v_prev_interactions, 0);
  v_curr_total := coalesce(v_profile_views, 0) + coalesce(v_interactions, 0);

  IF v_prev_total > 0 THEN
    v_growth := ROUND(((v_curr_total - v_prev_total) / v_prev_total) * 100);
  ELSE
    v_growth := NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'profile_views', coalesce(pv.cnt, 0),
      'interactions', coalesce(ix.cnt, 0)
    )
    ORDER BY d.day
  ), '[]'::jsonb)
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
      'repost_reach', coalesce(v_repost_reach, 0),
      'views_from_reposts', coalesce(v_views_from_reposts, 0),
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

-- ─── Feed engagement boost helper (used by client + SQL eligibility) ────────

CREATE OR REPLACE FUNCTION public.post_feed_engagement_boost(
  p_likes INT,
  p_comments INT,
  p_reposts INT
)
RETURNS INT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT LEAST(
    36,
    ROUND(
      ln(1 + GREATEST(coalesce(p_likes, 0), 0)) * 4.5
      + ln(1 + GREATEST(coalesce(p_comments, 0), 0)) * 6.5
      + ln(1 + GREATEST(coalesce(p_reposts, 0), 0)) * 11
    )::INT
  );
$$;

REVOKE ALL ON FUNCTION public.post_feed_engagement_boost(INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_feed_engagement_boost(INT, INT, INT)
  TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS posts_engagement_counts_idx
  ON public.posts (likes_count DESC, comments_count DESC, reposts_count DESC)
  WHERE coalesce(is_hidden, false) = false;

NOTIFY pgrst, 'reload schema';
