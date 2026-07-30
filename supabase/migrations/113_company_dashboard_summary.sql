-- 113_company_dashboard_summary.sql
-- Single owner-scoped RPC for the employer dashboard home.
-- Always scoped to auth.uid(); never accepts a company_id parameter.

CREATE OR REPLACE FUNCTION public.get_company_dashboard_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id UUID := auth.uid();
  v_role TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_today TIMESTAMPTZ := date_trunc('day', NOW());
  v_week_start TIMESTAMPTZ := date_trunc('day', NOW()) - INTERVAL '6 days';
  v_prev_week_start TIMESTAMPTZ := date_trunc('day', NOW()) - INTERVAL '13 days';
  v_prev_week_end TIMESTAMPTZ := date_trunc('day', NOW()) - INTERVAL '6 days';
  v_month_start TIMESTAMPTZ := date_trunc('day', NOW()) - INTERVAL '29 days';
  v_result JSONB;
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

  WITH
  company AS (
    SELECT
      cp.user_id,
      cp.company_name,
      cp.logo_path,
      cp.sector,
      cp.city,
      cp.is_verified,
      cp.verification_status,
      cp.verified_status,
      cp.company_type
    FROM public.company_profiles cp
    WHERE cp.user_id = v_company_id
  ),
  my_jobs AS (
    SELECT
      j.id,
      j.title,
      j.status,
      j.created_at,
      j.updated_at,
      j.city,
      j.job_type,
      j.work_mode,
      CASE
        WHEN j.status IN ('active', 'paused') THEN
          EXTRACT(EPOCH FROM (v_now - j.created_at)) / 86400.0
        ELSE
          EXTRACT(EPOCH FROM (coalesce(j.updated_at, v_now) - j.created_at)) / 86400.0
      END AS days_active
    FROM public.jobs j
    WHERE j.company_id = v_company_id
      AND coalesce(j.admin_hidden, FALSE) = FALSE
  ),
  apps AS (
    SELECT
      a.id,
      a.job_id,
      a.candidate_id,
      a.status,
      a.applied_at,
      a.full_name,
      CASE
        WHEN a.status IN ('pending', 'viewed', 'contacted') THEN 'pending'
        WHEN a.status = 'accepted' THEN 'accepted'
        WHEN a.status = 'rejected' THEN 'rejected'
        ELSE a.status
      END AS funnel_status
    FROM public.applications a
    JOIN my_jobs mj ON mj.id = a.job_id
  ),
  events AS (
    SELECT e.event_type, e.job_id, e.created_at, e.actor_id
    FROM public.company_analytics_events e
    WHERE e.company_id = v_company_id
  ),
  legacy_views AS (
    SELECT ra.job_id, ra.created_at
    FROM public.recommendation_analytics ra
    JOIN my_jobs mj ON mj.id = ra.job_id
    WHERE ra.event_type = 'job_viewed'
  ),
  follows_in AS (
    SELECT f.user_id, f.created_at
    FROM public.follows f
    WHERE f.target_id = v_company_id
      AND f.target_type IN ('business', 'organization', 'company')
  ),
  job_metrics AS (
    SELECT
      mj.id,
      mj.title,
      mj.status,
      mj.created_at,
      mj.city,
      mj.job_type,
      mj.work_mode,
      ROUND(mj.days_active::NUMERIC, 1) AS days_active,
      (
        (SELECT COUNT(*) FROM events e WHERE e.job_id = mj.id AND e.event_type = 'job_view')
        + (SELECT COUNT(*) FROM legacy_views lv WHERE lv.job_id = mj.id)
      )::INT AS views,
      (SELECT COUNT(*)::INT FROM apps a WHERE a.job_id = mj.id) AS applications
    FROM my_jobs mj
  ),
  week_apps AS (
    SELECT COUNT(*)::INT AS c FROM apps WHERE applied_at >= v_week_start
  ),
  prev_week_apps AS (
    SELECT COUNT(*)::INT AS c FROM apps
    WHERE applied_at >= v_prev_week_start AND applied_at < v_prev_week_end
  ),
  week_views AS (
    SELECT (
      (SELECT COUNT(*) FROM events WHERE event_type = 'job_view' AND created_at >= v_week_start)
      + (SELECT COUNT(*) FROM legacy_views WHERE created_at >= v_week_start)
    )::INT AS c
  ),
  prev_week_views AS (
    SELECT (
      (SELECT COUNT(*) FROM events
        WHERE event_type = 'job_view'
          AND created_at >= v_prev_week_start AND created_at < v_prev_week_end)
      + (SELECT COUNT(*) FROM legacy_views
        WHERE created_at >= v_prev_week_start AND created_at < v_prev_week_end)
    )::INT AS c
  ),
  week_followers AS (
    SELECT COUNT(*)::INT AS c FROM follows_in WHERE created_at >= v_week_start
  ),
  prev_week_followers AS (
    SELECT COUNT(*)::INT AS c FROM follows_in
    WHERE created_at >= v_prev_week_start AND created_at < v_prev_week_end
  ),
  week_interactions AS (
    SELECT COUNT(*)::INT AS c FROM events
    WHERE event_type IN ('post_view', 'post_like', 'post_comment', 'post_share', 'post_save')
      AND created_at >= v_week_start
  ),
  prev_week_interactions AS (
    SELECT COUNT(*)::INT AS c FROM events
    WHERE event_type IN ('post_view', 'post_like', 'post_comment', 'post_share', 'post_save')
      AND created_at >= v_prev_week_start AND created_at < v_prev_week_end
  ),
  stats AS (
    SELECT jsonb_build_object(
      'applications_total', (SELECT COUNT(*)::INT FROM apps),
      'applications_week', (SELECT c FROM week_apps),
      'applications_prev_week', (SELECT c FROM prev_week_apps),
      'applications_delta_pct', (
        SELECT CASE
          WHEN (SELECT c FROM prev_week_apps) = 0 AND (SELECT c FROM week_apps) = 0 THEN 0
          WHEN (SELECT c FROM prev_week_apps) = 0 THEN NULL
          ELSE ROUND((((SELECT c FROM week_apps) - (SELECT c FROM prev_week_apps))::NUMERIC
            / (SELECT c FROM prev_week_apps)::NUMERIC) * 100, 1)
        END
      ),
      'views_total', (
        SELECT (
          (SELECT COUNT(*) FROM events WHERE event_type = 'job_view')
          + (SELECT COUNT(*) FROM legacy_views)
        )::INT
      ),
      'views_week', (SELECT c FROM week_views),
      'views_prev_week', (SELECT c FROM prev_week_views),
      'views_delta_pct', (
        SELECT CASE
          WHEN (SELECT c FROM prev_week_views) = 0 AND (SELECT c FROM week_views) = 0 THEN 0
          WHEN (SELECT c FROM prev_week_views) = 0 THEN NULL
          ELSE ROUND((((SELECT c FROM week_views) - (SELECT c FROM prev_week_views))::NUMERIC
            / (SELECT c FROM prev_week_views)::NUMERIC) * 100, 1)
        END
      ),
      'followers_total', (SELECT COUNT(*)::INT FROM follows_in),
      'followers_week', (SELECT c FROM week_followers),
      'followers_prev_week', (SELECT c FROM prev_week_followers),
      'followers_delta_pct', (
        SELECT CASE
          WHEN (SELECT c FROM prev_week_followers) = 0 AND (SELECT c FROM week_followers) = 0 THEN 0
          WHEN (SELECT c FROM prev_week_followers) = 0 THEN NULL
          ELSE ROUND((((SELECT c FROM week_followers) - (SELECT c FROM prev_week_followers))::NUMERIC
            / (SELECT c FROM prev_week_followers)::NUMERIC) * 100, 1)
        END
      ),
      'interactions_total', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type IN ('post_view', 'post_like', 'post_comment', 'post_share', 'post_save')
      ),
      'interactions_week', (SELECT c FROM week_interactions),
      'interactions_prev_week', (SELECT c FROM prev_week_interactions),
      'interactions_delta_pct', (
        SELECT CASE
          WHEN (SELECT c FROM prev_week_interactions) = 0 AND (SELECT c FROM week_interactions) = 0 THEN 0
          WHEN (SELECT c FROM prev_week_interactions) = 0 THEN NULL
          ELSE ROUND((((SELECT c FROM week_interactions) - (SELECT c FROM prev_week_interactions))::NUMERIC
            / (SELECT c FROM prev_week_interactions)::NUMERIC) * 100, 1)
        END
      ),
      'jobs_active', (SELECT COUNT(*)::INT FROM my_jobs WHERE status = 'active'),
      'jobs_total', (SELECT COUNT(*)::INT FROM my_jobs),
      'posts_total', (
        SELECT COUNT(*)::INT FROM public.posts p
        WHERE p.author_id = v_company_id AND coalesce(p.is_hidden, FALSE) = FALSE
      ),
      'unread_notifications', (
        SELECT COUNT(*)::INT FROM public.notifications n
        WHERE n.recipient_id = v_company_id AND coalesce(n.read, FALSE) = FALSE
      ),
      'new_applications_today', (
        SELECT COUNT(*)::INT FROM apps WHERE applied_at >= v_today
      ),
      'new_profile_visits_today', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'profile_view' AND created_at >= v_today
      ),
      'new_notifications_today', (
        SELECT COUNT(*)::INT FROM public.notifications n
        WHERE n.recipient_id = v_company_id AND n.created_at >= v_today
      )
    ) AS data
  ),
  active_jobs AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(j) ORDER BY j.created_at DESC), '[]'::jsonb) AS data
    FROM (
      SELECT * FROM job_metrics
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 8
    ) j
  ),
  recent_applicants AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.applied_at DESC), '[]'::jsonb) AS data
    FROM (
      SELECT
        a.id,
        a.candidate_id AS user_id,
        a.job_id,
        a.status,
        a.funnel_status,
        a.applied_at,
        coalesce(nullif(trim(cp.full_name), ''), nullif(trim(a.full_name), ''), 'Candidato') AS full_name,
        cp.avatar_path,
        mj.title AS job_title
      FROM apps a
      JOIN my_jobs mj ON mj.id = a.job_id
      LEFT JOIN public.candidate_profiles cp ON cp.user_id = a.candidate_id
      ORDER BY a.applied_at DESC NULLS LAST
      LIMIT 8
    ) r
  ),
  chart_30d AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'day', d::date,
      'views', coalesce(v.c, 0),
      'applications', coalesce(a.c, 0)
    ) ORDER BY d), '[]'::jsonb) AS data
    FROM generate_series(v_month_start::date, v_today::date, '1 day'::interval) AS d
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INT AS c FROM (
        SELECT created_at FROM events
        WHERE event_type = 'job_view' AND created_at::date = d::date
        UNION ALL
        SELECT created_at FROM legacy_views
        WHERE created_at::date = d::date
      ) x
    ) v ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INT AS c FROM apps WHERE applied_at::date = d::date
    ) a ON TRUE
  ),
  activity AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.at DESC), '[]'::jsonb) AS data
    FROM (
      (
        SELECT
          a.id::text AS id,
          'application'::text AS type,
          a.applied_at AS at,
          'Nueva candidatura'::text AS title,
          coalesce(nullif(trim(cp.full_name), ''), 'Alguien')
            || ' aplicó a «' || mj.title || '»' AS detail
        FROM apps a
        JOIN my_jobs mj ON mj.id = a.job_id
        LEFT JOIN public.candidate_profiles cp ON cp.user_id = a.candidate_id
        ORDER BY a.applied_at DESC
        LIMIT 6
      )
      UNION ALL
      (
        SELECT
          ('follow-' || f.user_id::text || '-' || extract(epoch from f.created_at)::bigint)::text,
          'follow'::text,
          f.created_at,
          'Nuevo seguidor'::text,
          coalesce(nullif(trim(cp.full_name), ''), 'Alguien') || ' comenzó a seguir la empresa'
        FROM follows_in f
        LEFT JOIN public.candidate_profiles cp ON cp.user_id = f.user_id
        ORDER BY f.created_at DESC
        LIMIT 4
      )
      UNION ALL
      (
        SELECT
          ('job-' || mj.id::text)::text,
          'job_published'::text,
          mj.created_at,
          'Oferta publicada'::text,
          'Oferta «' || mj.title || '» publicada'
        FROM my_jobs mj
        ORDER BY mj.created_at DESC
        LIMIT 4
      )
      UNION ALL
      (
        SELECT
          ('post-' || p.id::text)::text,
          'post'::text,
          p.created_at,
          'Publicación nueva'::text,
          left(coalesce(p.content, 'Nueva publicación'), 80)
        FROM public.posts p
        WHERE p.author_id = v_company_id
          AND coalesce(p.is_hidden, FALSE) = FALSE
        ORDER BY p.created_at DESC
        LIMIT 3
      )
    ) x
    ORDER BY x.at DESC
    LIMIT 12
  )
  SELECT jsonb_build_object(
    'company', (SELECT to_jsonb(c) FROM company c),
    'stats', (SELECT data FROM stats),
    'jobs', (SELECT data FROM active_jobs),
    'applicants', (SELECT data FROM recent_applicants),
    'chart_30d', (SELECT data FROM chart_30d),
    'activity', (SELECT data FROM activity),
    'generated_at', v_now
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_dashboard_summary() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_company_dashboard_summary IS
  'Employer dashboard home payload. Always scoped to auth.uid().';
