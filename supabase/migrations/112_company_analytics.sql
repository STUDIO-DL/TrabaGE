-- 112_company_analytics.sql
-- Company-scoped analytics: event ledger + saved companies + owner-only bundle RPC.
-- Extensible for future metrics (time-to-hire, sources, conversion, AI tips).

-- ─── Event ledger (profile/job/post/contact engagement) ─────────────────────

CREATE TABLE IF NOT EXISTS public.company_analytics_events (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES public.company_profiles(user_id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL
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
                  'post_save'
                )),
  job_id        UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  post_id       UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS company_analytics_events_company_created_idx
  ON public.company_analytics_events (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS company_analytics_events_company_type_created_idx
  ON public.company_analytics_events (company_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS company_analytics_events_job_type_idx
  ON public.company_analytics_events (company_id, job_id, event_type)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS company_analytics_events_post_type_idx
  ON public.company_analytics_events (company_id, post_id, event_type)
  WHERE post_id IS NOT NULL;

ALTER TABLE public.company_analytics_events ENABLE ROW LEVEL SECURITY;

-- No direct table reads for clients; aggregates via SECURITY DEFINER RPC only.
DROP POLICY IF EXISTS "No direct select company analytics events" ON public.company_analytics_events;
CREATE POLICY "No direct select company analytics events"
  ON public.company_analytics_events
  FOR SELECT
  TO authenticated
  USING (FALSE);

DROP POLICY IF EXISTS "No direct insert company analytics events" ON public.company_analytics_events;
CREATE POLICY "No direct insert company analytics events"
  ON public.company_analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

REVOKE ALL ON public.company_analytics_events FROM PUBLIC;
GRANT SELECT, INSERT ON public.company_analytics_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.company_analytics_events_id_seq TO service_role;

-- ─── Saved companies (bookmark employer profiles) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_companies (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES public.company_profiles(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS saved_companies_company_created_idx
  ON public.saved_companies (company_id, created_at DESC);

ALTER TABLE public.saved_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saved companies" ON public.saved_companies;
CREATE POLICY "Users manage own saved companies"
  ON public.saved_companies
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Company owners count saves" ON public.saved_companies;
CREATE POLICY "Company owners count saves"
  ON public.saved_companies
  FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

REVOKE ALL ON public.saved_companies FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON public.saved_companies TO authenticated;
GRANT ALL ON public.saved_companies TO service_role;

-- ─── Track event (public insert path) ───────────────────────────────────────

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
    'post_share', 'post_save'
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

COMMENT ON FUNCTION public.track_company_analytics_event IS
  'Records company analytics events. Self-actions ignored. Aggregates via get_company_analytics_bundle only.';

-- ─── Company analytics bundle (owner-only, no cross-tenant data) ────────────

CREATE OR REPLACE FUNCTION public.get_company_analytics_bundle(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_jobs_limit INT DEFAULT 20,
  p_jobs_offset INT DEFAULT 0
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
  v_prev_from TIMESTAMPTZ;
  v_prev_to TIMESTAMPTZ;
  v_span INTERVAL;
  v_jobs_limit INT := GREATEST(1, LEAST(coalesce(p_jobs_limit, 20), 50));
  v_jobs_offset INT := GREATEST(0, coalesce(p_jobs_offset, 0));
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

  v_to := coalesce(p_to, NOW() + INTERVAL '1 day');
  v_from := coalesce(p_from, TIMESTAMPTZ '2000-01-01');

  IF v_to <= v_from THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;

  v_span := v_to - v_from;
  v_prev_to := v_from;
  v_prev_from := v_from - v_span;

  WITH
  my_jobs AS (
    SELECT
      j.id,
      j.title,
      j.status,
      j.created_at,
      j.updated_at,
      CASE
        WHEN j.status IN ('active', 'paused') THEN
          EXTRACT(EPOCH FROM (NOW() - j.created_at)) / 86400.0
        ELSE
          EXTRACT(EPOCH FROM (coalesce(j.updated_at, NOW()) - j.created_at)) / 86400.0
      END AS days_active
    FROM public.jobs j
    WHERE j.company_id = v_company_id
      AND coalesce(j.admin_hidden, FALSE) = FALSE
  ),
  apps AS (
    SELECT
      a.id,
      a.job_id,
      a.status,
      a.applied_at,
      CASE
        WHEN a.status IN ('pending', 'viewed', 'contacted') THEN 'pending'
        WHEN a.status = 'accepted' THEN 'accepted'
        WHEN a.status = 'rejected' THEN 'rejected'
        ELSE 'other'
      END AS funnel_status
    FROM public.applications a
    JOIN my_jobs mj ON mj.id = a.job_id
  ),
  follows_in AS (
    SELECT f.created_at
    FROM public.follows f
    WHERE f.target_id = v_company_id
      AND f.target_type IN ('business', 'organization', 'company')
  ),
  events AS (
    SELECT e.event_type, e.job_id, e.post_id, e.created_at
    FROM public.company_analytics_events e
    WHERE e.company_id = v_company_id
  ),
  -- Legacy job views from recommendation analytics (company-owned jobs only).
  legacy_job_views AS (
    SELECT ra.job_id, ra.created_at
    FROM public.recommendation_analytics ra
    JOIN my_jobs mj ON mj.id = ra.job_id
    WHERE ra.event_type = 'job_viewed'
  ),
  period_apps AS (
    SELECT * FROM apps WHERE applied_at >= v_from AND applied_at < v_to
  ),
  prev_apps AS (
    SELECT * FROM apps WHERE applied_at >= v_prev_from AND applied_at < v_prev_to
  ),
  summary AS (
    SELECT jsonb_build_object(
      'jobs_published', (SELECT COUNT(*)::INT FROM my_jobs WHERE created_at < v_to),
      'jobs_active', (SELECT COUNT(*)::INT FROM my_jobs WHERE status = 'active'),
      'jobs_closed', (SELECT COUNT(*)::INT FROM my_jobs WHERE status = 'closed'),
      'jobs_new_in_period', (SELECT COUNT(*)::INT FROM my_jobs WHERE created_at >= v_from AND created_at < v_to),
      'job_views', (
        SELECT (
          (SELECT COUNT(*) FROM events WHERE event_type = 'job_view' AND created_at >= v_from AND created_at < v_to)
          + (SELECT COUNT(*) FROM legacy_job_views WHERE created_at >= v_from AND created_at < v_to)
        )::INT
      ),
      'applications_total', (SELECT COUNT(*)::INT FROM period_apps),
      'applications_accepted', (SELECT COUNT(*)::INT FROM period_apps WHERE funnel_status = 'accepted'),
      'applications_rejected', (SELECT COUNT(*)::INT FROM period_apps WHERE funnel_status = 'rejected'),
      'applications_pending', (SELECT COUNT(*)::INT FROM period_apps WHERE funnel_status = 'pending'),
      'followers', (SELECT COUNT(*)::INT FROM follows_in),
      'followers_new', (SELECT COUNT(*)::INT FROM follows_in WHERE created_at >= v_from AND created_at < v_to),
      'post_interactions', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type IN ('post_view', 'post_like', 'post_comment', 'post_share', 'post_save')
          AND created_at >= v_from AND created_at < v_to
      ),
      'posts_published', (
        SELECT COUNT(*)::INT FROM public.posts p
        WHERE p.author_id = v_company_id
          AND coalesce(p.is_hidden, FALSE) = FALSE
          AND p.created_at >= v_from AND p.created_at < v_to
      ),
      'growth_pct', (
        SELECT CASE
          WHEN (SELECT COUNT(*) FROM prev_apps) = 0 AND (SELECT COUNT(*) FROM period_apps) = 0 THEN 0
          WHEN (SELECT COUNT(*) FROM prev_apps) = 0 THEN NULL
          ELSE ROUND(
            (
              ((SELECT COUNT(*) FROM period_apps)::NUMERIC - (SELECT COUNT(*) FROM prev_apps)::NUMERIC)
              / (SELECT COUNT(*) FROM prev_apps)::NUMERIC
            ) * 100,
            1
          )
        END
      ),
      'applications_prev', (SELECT COUNT(*)::INT FROM prev_apps),
      'profile_visits', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'profile_view' AND created_at >= v_from AND created_at < v_to
      ),
      'website_clicks', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'website_click' AND created_at >= v_from AND created_at < v_to
      ),
      'whatsapp_clicks', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'whatsapp_click' AND created_at >= v_from AND created_at < v_to
      ),
      'email_clicks', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'email_click' AND created_at >= v_from AND created_at < v_to
      ),
      'company_saves', (
        SELECT COUNT(*)::INT FROM public.saved_companies sc
        WHERE sc.company_id = v_company_id
          AND sc.created_at >= v_from AND sc.created_at < v_to
      ),
      'post_views', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'post_view' AND created_at >= v_from AND created_at < v_to
      ),
      'post_likes', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'post_like' AND created_at >= v_from AND created_at < v_to
      ),
      'post_comments', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'post_comment' AND created_at >= v_from AND created_at < v_to
      ),
      'post_shares', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'post_share' AND created_at >= v_from AND created_at < v_to
      ),
      'post_saves', (
        SELECT COUNT(*)::INT FROM events
        WHERE event_type = 'post_save' AND created_at >= v_from AND created_at < v_to
      )
    ) AS data
  ),
  jobs_stats AS (
    SELECT
      mj.id,
      mj.title,
      mj.status,
      mj.created_at,
      ROUND(mj.days_active::NUMERIC, 1) AS days_active,
      (
        (SELECT COUNT(*) FROM events e WHERE e.job_id = mj.id AND e.event_type = 'job_view'
          AND e.created_at >= v_from AND e.created_at < v_to)
        + (SELECT COUNT(*) FROM legacy_job_views lv WHERE lv.job_id = mj.id
          AND lv.created_at >= v_from AND lv.created_at < v_to)
      )::INT AS views,
      (SELECT COUNT(*)::INT FROM apps a WHERE a.job_id = mj.id
        AND a.applied_at >= v_from AND a.applied_at < v_to) AS applications,
      (SELECT COUNT(*)::INT FROM apps a WHERE a.job_id = mj.id AND a.funnel_status = 'pending'
        AND a.applied_at >= v_from AND a.applied_at < v_to) AS pending,
      (SELECT COUNT(*)::INT FROM apps a WHERE a.job_id = mj.id AND a.funnel_status = 'accepted'
        AND a.applied_at >= v_from AND a.applied_at < v_to) AS accepted,
      (SELECT COUNT(*)::INT FROM apps a WHERE a.job_id = mj.id AND a.funnel_status = 'rejected'
        AND a.applied_at >= v_from AND a.applied_at < v_to) AS rejected
    FROM my_jobs mj
  ),
  jobs_page AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(js) ORDER BY js.created_at DESC), '[]'::jsonb) AS data
    FROM (
      SELECT * FROM jobs_stats
      ORDER BY created_at DESC
      LIMIT v_jobs_limit OFFSET v_jobs_offset
    ) js
  ),
  top_jobs AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.applications DESC, t.views DESC), '[]'::jsonb) AS data
    FROM (
      SELECT id, title, status, views, applications, pending, accepted, rejected, created_at, days_active
      FROM jobs_stats
      WHERE applications > 0 OR views > 0
      ORDER BY applications DESC, views DESC
      LIMIT 5
    ) t
  ),
  apps_by_month AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('month', m, 'value', c) ORDER BY m), '[]'::jsonb) AS data
    FROM (
      SELECT to_char(date_trunc('month', applied_at), 'YYYY-MM') AS m, COUNT(*)::INT AS c
      FROM period_apps
      GROUP BY 1
      ORDER BY 1
    ) x
  ),
  views_by_week AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('week', w, 'value', c) ORDER BY w), '[]'::jsonb) AS data
    FROM (
      SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS w, COUNT(*)::INT AS c
      FROM (
        SELECT created_at FROM events
        WHERE event_type = 'job_view' AND created_at >= v_from AND created_at < v_to
        UNION ALL
        SELECT created_at FROM legacy_job_views
        WHERE created_at >= v_from AND created_at < v_to
      ) v
      GROUP BY 1
      ORDER BY 1
    ) x
  ),
  status_pie AS (
    SELECT jsonb_build_array(
      jsonb_build_object('label', 'Pendientes', 'value', (SELECT COUNT(*)::INT FROM period_apps WHERE funnel_status = 'pending')),
      jsonb_build_object('label', 'Aceptadas', 'value', (SELECT COUNT(*)::INT FROM period_apps WHERE funnel_status = 'accepted')),
      jsonb_build_object('label', 'Rechazadas', 'value', (SELECT COUNT(*)::INT FROM period_apps WHERE funnel_status = 'rejected'))
    ) AS data
  ),
  future_hooks AS (
    SELECT jsonb_build_object(
      'time_to_hire_days', NULL,
      'application_sources', '[]'::jsonb,
      'conversion_by_job', '[]'::jsonb,
      'top_candidate_sectors', '[]'::jsonb,
      'ai_recommendations', '[]'::jsonb,
      'month_over_month', jsonb_build_object(
        'applications_current', (SELECT COUNT(*)::INT FROM period_apps),
        'applications_previous', (SELECT COUNT(*)::INT FROM prev_apps)
      )
    ) AS data
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('from', v_from, 'to', v_to),
    'summary', (SELECT data FROM summary),
    'jobs', (SELECT data FROM jobs_page),
    'jobs_total', (SELECT COUNT(*)::INT FROM my_jobs),
    'jobs_limit', v_jobs_limit,
    'jobs_offset', v_jobs_offset,
    'top_jobs', (SELECT data FROM top_jobs),
    'charts', jsonb_build_object(
      'applications_by_month', (SELECT data FROM apps_by_month),
      'views_by_week', (SELECT data FROM views_by_week),
      'application_status', (SELECT data FROM status_pie),
      'top_performing_jobs', (SELECT data FROM top_jobs)
    ),
    'profile', jsonb_build_object(
      'visits', (SELECT (data->>'profile_visits')::INT FROM summary),
      'followers', (SELECT (data->>'followers')::INT FROM summary),
      'website_clicks', (SELECT (data->>'website_clicks')::INT FROM summary),
      'whatsapp_clicks', (SELECT (data->>'whatsapp_clicks')::INT FROM summary),
      'email_clicks', (SELECT (data->>'email_clicks')::INT FROM summary),
      'saves', (SELECT (data->>'company_saves')::INT FROM summary)
    ),
    'posts', jsonb_build_object(
      'published', (SELECT (data->>'posts_published')::INT FROM summary),
      'views', (SELECT (data->>'post_views')::INT FROM summary),
      'likes', (SELECT (data->>'post_likes')::INT FROM summary),
      'comments', (SELECT (data->>'post_comments')::INT FROM summary),
      'shares', (SELECT (data->>'post_shares')::INT FROM summary),
      'saves', (SELECT (data->>'post_saves')::INT FROM summary),
      'interactions', (SELECT (data->>'post_interactions')::INT FROM summary)
    ),
    'future', (SELECT data FROM future_hooks),
    'disclaimer', 'Estadísticas de tu actividad en TrabaGE. Solo visibles para tu cuenta.'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_analytics_bundle(TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_analytics_bundle(TIMESTAMPTZ, TIMESTAMPTZ, INT, INT)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_company_analytics_bundle IS
  'Owner-only company analytics. Always scoped to auth.uid(); never accepts a company_id parameter.';

-- Helpful indexes for company-scoped aggregates (idempotent).
CREATE INDEX IF NOT EXISTS jobs_company_created_idx
  ON public.jobs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS applications_job_applied_idx
  ON public.applications (job_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS follows_target_created_idx
  ON public.follows (target_id, target_type, created_at DESC);

CREATE INDEX IF NOT EXISTS posts_author_created_idx
  ON public.posts (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recommendation_analytics_job_viewed_idx
  ON public.recommendation_analytics (job_id, created_at DESC)
  WHERE event_type = 'job_viewed';
