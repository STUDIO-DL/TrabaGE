-- Fix PostgreSQL 42803: correlated subqueries referenced ungrouped fj.title / fj.city / fj.sector.
-- Replaces admin_analytics_bundle ranking CTEs with join-based aggregates.

CREATE OR REPLACE FUNCTION public.admin_analytics_bundle(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_city TEXT DEFAULT NULL,
  p_sector TEXT DEFAULT NULL,
  p_account_role TEXT DEFAULT NULL,
  p_job_type TEXT DEFAULT NULL,
  p_work_mode TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
  v_prev_from TIMESTAMPTZ;
  v_prev_to TIMESTAMPTZ;
  v_span INTERVAL;
  v_city TEXT := NULLIF(trim(p_city), '');
  v_sector TEXT := NULLIF(trim(p_sector), '');
  v_role TEXT := NULLIF(trim(p_account_role), '');
  v_job_type TEXT := NULLIF(trim(p_job_type), '');
  v_work_mode TEXT := NULLIF(trim(p_work_mode), '');
  v_min_group INT := 5;
  v_result JSONB;
BEGIN
  PERFORM public.require_admin();

  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;

  IF v_role IS NOT NULL AND v_role NOT IN ('personal', 'business', 'organization') THEN
    RAISE EXCEPTION 'Filtro de tipo de cuenta inválido';
  END IF;

  v_from := p_from;
  v_to := p_to;
  v_span := v_to - v_from;
  v_prev_to := v_from;
  v_prev_from := v_from - v_span;

  WITH
  personal_users AS (
    SELECT ur.user_id, ur.created_at, cp.city, cp.sector, cp.setup_complete, cp.is_active, cp.cv_path
    FROM public.user_roles ur
    LEFT JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.role = 'personal'
      AND (v_city IS NULL OR lower(coalesce(cp.city, '')) = lower(v_city))
      AND (v_sector IS NULL OR lower(coalesce(cp.sector, '')) = lower(v_sector))
  ),
  business_users AS (
    SELECT ur.user_id, ur.created_at, cp.city, cp.sector, cp.setup_complete, cp.is_active,
           cp.is_verified, cp.verified_status, cp.verification_status, cp.company_type, ur.role
    FROM public.user_roles ur
    JOIN public.company_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.role = 'business'
      AND (v_city IS NULL OR lower(coalesce(cp.city, '')) = lower(v_city))
      AND (v_sector IS NULL OR lower(coalesce(cp.sector, '')) = lower(v_sector))
  ),
  org_users AS (
    SELECT ur.user_id, ur.created_at, cp.city, cp.sector, cp.setup_complete, cp.is_active,
           cp.is_verified, cp.verified_status, cp.verification_status, cp.company_type, ur.role
    FROM public.user_roles ur
    JOIN public.company_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.role = 'organization'
      AND (v_city IS NULL OR lower(coalesce(cp.city, '')) = lower(v_city))
      AND (v_sector IS NULL OR lower(coalesce(cp.sector, '')) = lower(v_sector))
  ),
  employer_users AS (
    SELECT * FROM business_users
    UNION ALL
    SELECT * FROM org_users
  ),
  filtered_jobs AS (
    SELECT
      j.id,
      j.title,
      j.status,
      j.created_at,
      j.city,
      coalesce(nullif(trim(j.sector), ''), nullif(trim(cp.sector), ''), 'Sin sector') AS sector,
      j.job_type,
      j.work_mode,
      j.company_id,
      j.required_skills,
      j.admin_hidden
    FROM public.jobs j
    LEFT JOIN public.company_profiles cp ON cp.user_id = j.company_id
    WHERE coalesce(j.admin_hidden, FALSE) = FALSE
      AND (v_city IS NULL OR lower(coalesce(j.city, cp.city, '')) = lower(v_city))
      AND (
        v_sector IS NULL
        OR lower(coalesce(nullif(trim(j.sector), ''), nullif(trim(cp.sector), ''), '')) = lower(v_sector)
      )
      AND (v_job_type IS NULL OR j.job_type = v_job_type)
      AND (v_work_mode IS NULL OR j.work_mode = v_work_mode)
      AND (
        v_role IS NULL
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = j.company_id AND ur.role = v_role
        )
      )
  ),
  filtered_apps AS (
    SELECT a.id, a.job_id, a.candidate_id, a.applied_at, a.status
    FROM public.applications a
    JOIN filtered_jobs fj ON fj.id = a.job_id
  ),
  filtered_posts AS (
    SELECT p.id, p.author_id, p.author_type, p.created_at, p.is_hidden
    FROM public.posts p
    WHERE coalesce(p.is_hidden, FALSE) = FALSE
      AND (v_role IS NULL OR p.author_type = v_role)
  ),
  metric AS (
    SELECT jsonb_build_object(
      'users_total', (SELECT count(*)::INT FROM personal_users WHERE (v_role IS NULL OR v_role = 'personal')),
      'users_new', (
        SELECT count(*)::INT FROM personal_users
        WHERE created_at >= v_from AND created_at < v_to
          AND (v_role IS NULL OR v_role = 'personal')
      ),
      'users_new_prev', (
        SELECT count(*)::INT FROM personal_users
        WHERE created_at >= v_prev_from AND created_at < v_prev_to
          AND (v_role IS NULL OR v_role = 'personal')
      ),
      'users_setup_complete', (
        SELECT count(*)::INT FROM personal_users
        WHERE coalesce(setup_complete, FALSE) = TRUE
          AND (v_role IS NULL OR v_role = 'personal')
      ),
      'users_setup_incomplete', (
        SELECT count(*)::INT FROM personal_users
        WHERE coalesce(setup_complete, FALSE) = FALSE
          AND (v_role IS NULL OR v_role = 'personal')
      ),
      'users_with_cv', (
        SELECT count(*)::INT FROM personal_users
        WHERE cv_path IS NOT NULL AND length(trim(cv_path)) > 0
          AND (v_role IS NULL OR v_role = 'personal')
      ),
      'users_with_application', (
        SELECT count(DISTINCT a.candidate_id)::INT
        FROM filtered_apps a
        WHERE a.applied_at >= v_from AND a.applied_at < v_to
      ),
      'users_with_post', (
        SELECT count(DISTINCT p.author_id)::INT
        FROM filtered_posts p
        WHERE p.author_type = 'personal'
          AND p.created_at >= v_from AND p.created_at < v_to
      ),
      'users_with_service', (
        SELECT count(DISTINCT s.user_id)::INT
        FROM public.services s
        JOIN personal_users pu ON pu.user_id = s.user_id
      ),
      'business_total', (SELECT count(*)::INT FROM business_users WHERE (v_role IS NULL OR v_role = 'business')),
      'business_new', (
        SELECT count(*)::INT FROM business_users
        WHERE created_at >= v_from AND created_at < v_to
          AND (v_role IS NULL OR v_role = 'business')
      ),
      'business_new_prev', (
        SELECT count(*)::INT FROM business_users
        WHERE created_at >= v_prev_from AND created_at < v_prev_to
          AND (v_role IS NULL OR v_role = 'business')
      ),
      'org_total', (SELECT count(*)::INT FROM org_users WHERE (v_role IS NULL OR v_role = 'organization')),
      'org_new', (
        SELECT count(*)::INT FROM org_users
        WHERE created_at >= v_from AND created_at < v_to
          AND (v_role IS NULL OR v_role = 'organization')
      ),
      'org_new_prev', (
        SELECT count(*)::INT FROM org_users
        WHERE created_at >= v_prev_from AND created_at < v_prev_to
          AND (v_role IS NULL OR v_role = 'organization')
      ),
      'employers_verified', (
        SELECT count(*)::INT FROM employer_users eu
        WHERE (
          eu.is_verified = TRUE
          OR eu.verified_status = 'verified'
          OR eu.verification_status = 'approved'
        )
        AND (v_role IS NULL OR eu.role = v_role)
      ),
      'employers_active', (
        SELECT count(*)::INT FROM employer_users eu
        WHERE coalesce(eu.is_active, TRUE) = TRUE
          AND (v_role IS NULL OR eu.role = v_role)
      ),
      'employers_with_jobs', (
        SELECT count(DISTINCT fj.company_id)::INT
        FROM filtered_jobs fj
        WHERE fj.created_at >= v_from AND fj.created_at < v_to
      ),
      'employers_with_posts', (
        SELECT count(DISTINCT p.author_id)::INT
        FROM filtered_posts p
        WHERE p.author_type IN ('business', 'organization')
          AND p.created_at >= v_from AND p.created_at < v_to
      ),
      'jobs_total', (SELECT count(*)::INT FROM filtered_jobs),
      'jobs_active', (SELECT count(*)::INT FROM filtered_jobs WHERE status = 'active'),
      'jobs_closed', (SELECT count(*)::INT FROM filtered_jobs WHERE status = 'closed'),
      'jobs_new', (
        SELECT count(*)::INT FROM filtered_jobs
        WHERE created_at >= v_from AND created_at < v_to
      ),
      'jobs_new_prev', (
        SELECT count(*)::INT FROM filtered_jobs
        WHERE created_at >= v_prev_from AND created_at < v_prev_to
      ),
      'applications_total', (
        SELECT count(*)::INT FROM filtered_apps
        WHERE applied_at >= v_from AND applied_at < v_to
      ),
      'applications_prev', (
        SELECT count(*)::INT FROM filtered_apps
        WHERE applied_at >= v_prev_from AND applied_at < v_prev_to
      ),
      'posts_total', (
        SELECT count(*)::INT FROM filtered_posts
        WHERE created_at >= v_from AND created_at < v_to
      ),
      'posts_prev', (
        SELECT count(*)::INT FROM filtered_posts
        WHERE created_at >= v_prev_from AND created_at < v_prev_to
      ),
      'messages_total', (
        SELECT count(*)::INT FROM public.messages m
        WHERE m.created_at >= v_from AND m.created_at < v_to
      ),
      'messages_prev', (
        SELECT count(*)::INT FROM public.messages m
        WHERE m.created_at >= v_prev_from AND m.created_at < v_prev_to
      )
    ) AS data
  ),
  users_by_city AS (
    SELECT coalesce(nullif(trim(city), ''), 'Sin ciudad') AS label, count(*)::INT AS value
    FROM personal_users
    WHERE (v_role IS NULL OR v_role = 'personal')
    GROUP BY 1
    HAVING count(*) >= v_min_group
    ORDER BY value DESC
    LIMIT 20
  ),
  users_by_sector AS (
    SELECT coalesce(nullif(trim(sector), ''), 'Sin sector') AS label, count(*)::INT AS value
    FROM personal_users
    WHERE (v_role IS NULL OR v_role = 'personal')
    GROUP BY 1
    HAVING count(*) >= v_min_group
    ORDER BY value DESC
    LIMIT 20
  ),
  employers_by_city AS (
    SELECT coalesce(nullif(trim(city), ''), 'Sin ciudad') AS label, count(*)::INT AS value
    FROM employer_users
    WHERE (v_role IS NULL OR role = v_role)
    GROUP BY 1
    HAVING count(*) >= v_min_group
    ORDER BY value DESC
    LIMIT 20
  ),
  employers_by_sector AS (
    SELECT coalesce(nullif(trim(sector), ''), 'Sin sector') AS label, count(*)::INT AS value
    FROM employer_users
    WHERE (v_role IS NULL OR role = v_role)
    GROUP BY 1
    HAVING count(*) >= v_min_group
    ORDER BY value DESC
    LIMIT 20
  ),
  job_titles AS (
    SELECT
      o.label,
      o.offers,
      coalesce(a.applications, 0)::INT AS applications
    FROM (
      SELECT
        coalesce(nullif(trim(title), ''), 'Sin título') AS label,
        lower(coalesce(nullif(trim(title), ''), 'Sin título')) AS title_key,
        count(*)::INT AS offers
      FROM filtered_jobs
      WHERE created_at >= v_from AND created_at < v_to
      GROUP BY 1, 2
      HAVING count(*) >= 1
    ) o
    LEFT JOIN (
      SELECT
        lower(coalesce(nullif(trim(j.title), ''), 'Sin título')) AS title_key,
        count(*)::INT AS applications
      FROM filtered_apps a
      JOIN filtered_jobs j ON j.id = a.job_id
      WHERE a.applied_at >= v_from AND a.applied_at < v_to
      GROUP BY 1
    ) a ON a.title_key = o.title_key
    ORDER BY o.offers DESC, applications DESC
    LIMIT 25
  ),
  sector_activity AS (
    SELECT
      o.label,
      o.offers,
      o.employers,
      coalesce(a.applications, 0)::INT AS applications,
      coalesce(c.candidates, 0)::INT AS candidates
    FROM (
      SELECT
        sector AS label,
        count(*)::INT AS offers,
        count(DISTINCT company_id)::INT AS employers
      FROM filtered_jobs
      WHERE created_at >= v_from AND created_at < v_to
      GROUP BY sector
    ) o
    LEFT JOIN (
      SELECT
        j.sector AS label,
        count(*)::INT AS applications
      FROM filtered_apps a
      JOIN filtered_jobs j ON j.id = a.job_id
      WHERE a.applied_at >= v_from AND a.applied_at < v_to
      GROUP BY j.sector
    ) a ON a.label IS NOT DISTINCT FROM o.label
    LEFT JOIN (
      SELECT
        lower(coalesce(sector, '')) AS sector_key,
        count(*)::INT AS candidates
      FROM personal_users
      GROUP BY 1
    ) c ON c.sector_key = lower(coalesce(o.label, ''))
    ORDER BY o.offers DESC
    LIMIT 25
  ),
  geo_activity AS (
    SELECT
      o.label,
      o.offers,
      coalesce(c.candidates, 0)::INT AS candidates,
      coalesce(e.employers, 0)::INT AS employers,
      coalesce(a.applications, 0)::INT AS applications
    FROM (
      SELECT
        coalesce(nullif(trim(city), ''), 'Sin ciudad') AS label,
        lower(coalesce(city, '')) AS city_key,
        count(*)::INT AS offers
      FROM filtered_jobs
      WHERE created_at >= v_from AND created_at < v_to
      GROUP BY 1, 2
    ) o
    LEFT JOIN (
      SELECT lower(coalesce(city, '')) AS city_key, count(*)::INT AS candidates
      FROM personal_users
      GROUP BY 1
    ) c ON c.city_key = o.city_key
    LEFT JOIN (
      SELECT lower(coalesce(city, '')) AS city_key, count(*)::INT AS employers
      FROM employer_users
      GROUP BY 1
    ) e ON e.city_key = o.city_key
    LEFT JOIN (
      SELECT
        lower(coalesce(j.city, '')) AS city_key,
        count(*)::INT AS applications
      FROM filtered_apps a
      JOIN filtered_jobs j ON j.id = a.job_id
      WHERE a.applied_at >= v_from AND a.applied_at < v_to
      GROUP BY 1
    ) a ON a.city_key = o.city_key
    ORDER BY o.offers DESC
    LIMIT 25
  ),
  skills_demand AS (
    SELECT lower(trim(skill)) AS key, trim(skill) AS label, count(*)::INT AS value
    FROM filtered_jobs fj
    CROSS JOIN LATERAL unnest(coalesce(fj.required_skills, ARRAY[]::TEXT[])) AS skill
    WHERE fj.created_at >= v_from AND fj.created_at < v_to
      AND nullif(trim(skill), '') IS NOT NULL
    GROUP BY 1, 2
    ORDER BY value DESC
    LIMIT 30
  ),
  skills_supply AS (
    SELECT lower(trim(s.name)) AS key, trim(s.name) AS label, count(*)::INT AS value
    FROM public.skills s
    JOIN personal_users pu ON pu.user_id = s.user_id
    WHERE nullif(trim(s.name), '') IS NOT NULL
    GROUP BY 1, 2
    HAVING count(*) >= v_min_group
    ORDER BY value DESC
    LIMIT 30
  ),
  skill_gap AS (
    SELECT
      d.label,
      d.value AS demand,
      coalesce(s.value, 0) AS supply,
      CASE
        WHEN d.value >= 3 AND coalesce(s.value, 0) = 0 THEN 'posible_brecha'
        WHEN d.value >= 3 AND coalesce(s.value, 0) > 0 AND d.value::NUMERIC / s.value >= 2 THEN 'posible_brecha'
        WHEN d.value >= 3 AND s.value >= d.value THEN 'cobertura_relativa'
        ELSE 'indicador_preliminar'
      END AS status
    FROM skills_demand d
    LEFT JOIN skills_supply s ON s.key = d.key
    ORDER BY d.value DESC
    LIMIT 30
  ),
  education_areas AS (
    SELECT
      coalesce(nullif(trim(e.program), ''), 'Sin programa') AS label,
      count(*)::INT AS value
    FROM public.education e
    JOIN personal_users pu ON pu.user_id = e.user_id
    GROUP BY 1
    HAVING count(*) >= v_min_group
    ORDER BY value DESC
    LIMIT 20
  ),
  series_users AS (
    SELECT to_char(day, 'YYYY-MM-DD') AS day, count(pu.user_id)::INT AS value
    FROM generate_series(date_trunc('day', v_from), date_trunc('day', v_to - interval '1 second'), interval '1 day') AS day
    LEFT JOIN personal_users pu
      ON pu.created_at >= day AND pu.created_at < day + interval '1 day'
     AND (v_role IS NULL OR v_role = 'personal')
    GROUP BY day
    ORDER BY day
  ),
  series_jobs AS (
    SELECT to_char(day, 'YYYY-MM-DD') AS day, count(fj.id)::INT AS value
    FROM generate_series(date_trunc('day', v_from), date_trunc('day', v_to - interval '1 second'), interval '1 day') AS day
    LEFT JOIN filtered_jobs fj
      ON fj.created_at >= day AND fj.created_at < day + interval '1 day'
    GROUP BY day
    ORDER BY day
  ),
  series_apps AS (
    SELECT to_char(day, 'YYYY-MM-DD') AS day, count(a.id)::INT AS value
    FROM generate_series(date_trunc('day', v_from), date_trunc('day', v_to - interval '1 second'), interval '1 day') AS day
    LEFT JOIN filtered_apps a
      ON a.applied_at >= day AND a.applied_at < day + interval '1 day'
    GROUP BY day
    ORDER BY day
  ),
  trends AS (
    SELECT *
    FROM (
      SELECT
        'jobs_new'::TEXT AS key,
        'Ofertas publicadas'::TEXT AS label,
        (SELECT (metric.data->>'jobs_new')::INT FROM metric) AS current_value,
        (SELECT (metric.data->>'jobs_new_prev')::INT FROM metric) AS previous_value
      UNION ALL
      SELECT 'applications_total', 'Candidaturas',
        (SELECT (metric.data->>'applications_total')::INT FROM metric),
        (SELECT (metric.data->>'applications_prev')::INT FROM metric)
      UNION ALL
      SELECT 'users_new', 'Nuevos perfiles personales',
        (SELECT (metric.data->>'users_new')::INT FROM metric),
        (SELECT (metric.data->>'users_new_prev')::INT FROM metric)
      UNION ALL
      SELECT 'business_new', 'Nuevas empresas',
        (SELECT (metric.data->>'business_new')::INT FROM metric),
        (SELECT (metric.data->>'business_new_prev')::INT FROM metric)
      UNION ALL
      SELECT 'posts_total', 'Publicaciones',
        (SELECT (metric.data->>'posts_total')::INT FROM metric),
        (SELECT (metric.data->>'posts_prev')::INT FROM metric)
    ) t
    WHERE previous_value >= 3 OR current_value >= 3
  )
  SELECT jsonb_build_object(
    'disclaimer', 'Datos observados dentro de TrabaGE',
    'methodology', 'Los indicadores reflejan actividad agregada de la plataforma. No constituyen necesariamente una representación completa del mercado laboral nacional. Segmentos con menos de 5 observaciones se omiten por privacidad.',
    'min_group_size', v_min_group,
    'period', jsonb_build_object('from', v_from, 'to', v_to),
    'previous_period', jsonb_build_object('from', v_prev_from, 'to', v_prev_to),
    'filters', jsonb_build_object(
      'city', v_city,
      'sector', v_sector,
      'account_role', v_role,
      'job_type', v_job_type,
      'work_mode', v_work_mode
    ),
    'summary', (SELECT data FROM metric),
    'rankings', jsonb_build_object(
      'users_by_city', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM users_by_city u), '[]'::jsonb),
      'users_by_sector', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM users_by_sector u), '[]'::jsonb),
      'employers_by_city', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM employers_by_city u), '[]'::jsonb),
      'employers_by_sector', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM employers_by_sector u), '[]'::jsonb),
      'job_titles', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM job_titles u), '[]'::jsonb),
      'sector_activity', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM sector_activity u), '[]'::jsonb),
      'geo_activity', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM geo_activity u), '[]'::jsonb),
      'skills_demand', coalesce((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value)) FROM skills_demand), '[]'::jsonb),
      'skills_supply', coalesce((SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value)) FROM skills_supply), '[]'::jsonb),
      'skill_gaps', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM skill_gap u), '[]'::jsonb),
      'education_areas', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM education_areas u), '[]'::jsonb)
    ),
    'timeseries', jsonb_build_object(
      'users', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM series_users u), '[]'::jsonb),
      'jobs', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM series_jobs u), '[]'::jsonb),
      'applications', coalesce((SELECT jsonb_agg(to_jsonb(u)) FROM series_apps u), '[]'::jsonb)
    ),
    'trends', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'key', key,
          'label', label,
          'current', current_value,
          'previous', previous_value,
          'delta', current_value - previous_value,
          'delta_pct', CASE
            WHEN previous_value = 0 AND current_value = 0 THEN NULL
            WHEN previous_value = 0 THEN NULL
            ELSE round(((current_value - previous_value)::NUMERIC / previous_value) * 100, 1)
          END,
          'sufficient', (previous_value >= 3 OR current_value >= 3)
        )
      )
      FROM trends
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_analytics_bundle(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_analytics_bundle(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
