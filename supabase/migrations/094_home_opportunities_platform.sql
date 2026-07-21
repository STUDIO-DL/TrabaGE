-- =============================================
-- 094_home_opportunities_platform.sql
-- Hiring companies RPC + personalized home feed scoring
-- =============================================

CREATE OR REPLACE FUNCTION public.get_companies_hiring(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  logo_path TEXT,
  sector TEXT,
  city TEXT,
  active_jobs_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.user_id AS company_id,
    cp.company_name,
    cp.logo_path,
    cp.sector,
    cp.city,
    COUNT(j.id)::BIGINT AS active_jobs_count
  FROM public.company_profiles cp
  INNER JOIN public.jobs j ON j.company_id = cp.user_id
  WHERE j.status = 'active'
    AND coalesce(j.admin_hidden, false) = false
    AND coalesce(cp.is_active, true) = true
    AND public.is_public_app_user(cp.user_id)
  GROUP BY cp.user_id, cp.company_name, cp.logo_path, cp.sector, cp.city
  HAVING COUNT(j.id) > 0
  ORDER BY active_jobs_count DESC, cp.company_name ASC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE EXECUTE ON FUNCTION public.get_companies_hiring(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_companies_hiring(INT, INT) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id UUID,
  p_role TEXT,
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  item_key TEXT,
  content_type TEXT,
  relevance_score INT,
  sort_at TIMESTAMPTZ,
  payload JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool INT := GREATEST(p_limit * 2, 40);
  v_off INT := GREATEST(p_offset, 0);
  v_feed_mode TEXT := 'candidate';
  v_company_type TEXT;
  v_sector TEXT;
  v_is_institution BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NOT NULL
     AND p_user_id IS NOT NULL
     AND auth.uid() <> p_user_id
     AND public.get_my_role() <> 'admin' THEN
    RETURN;
  END IF;

  IF p_role IN ('company', 'business', 'organization') AND p_user_id IS NOT NULL THEN
    SELECT coalesce(cp.company_type, ''), coalesce(cp.sector, '')
    INTO v_company_type, v_sector
    FROM public.company_profiles cp
    WHERE cp.user_id = p_user_id;

    v_is_institution := v_company_type IN ('Institucion publica', 'ONG');
    v_feed_mode := CASE WHEN v_is_institution THEN 'institution' ELSE 'company' END;
  END IF;

  IF v_feed_mode = 'candidate' THEN
    RETURN QUERY
    WITH
    profile_ctx AS (
      SELECT
        coalesce(cp.sector, '') AS sector,
        coalesce(cp.city, '') AS city,
        coalesce(cp.province, '') AS province,
        coalesce(cp.years_experience, 0) AS years_experience,
        coalesce(cp.job_preferences, '{}'::jsonb) AS job_preferences
      FROM public.candidate_profiles cp
      WHERE cp.user_id = p_user_id
    ),
    followed_ids AS (
      SELECT f.target_id
      FROM public.follows f
      WHERE f.user_id = p_user_id
    ),
    skill_names AS (
      SELECT lower(trim(s.name)) AS name
      FROM public.skills s
      WHERE s.user_id = p_user_id
        AND coalesce(trim(s.name), '') <> ''
    ),
    posts_pool AS (
      SELECT
        scored.item_key,
        scored.content_type,
        scored.relevance_score,
        scored.sort_at,
        scored.payload
      FROM (
        SELECT
          ('post:' || p.id::TEXT) AS item_key,
          CASE
            WHEN p.content_type IN ('advice', 'career_tip') THEN 'advice'
            ELSE 'post'
          END AS content_type,
          (
            8
            + CASE WHEN fd.target_id IS NOT NULL THEN 35 ELSE 0 END
            + CASE
                WHEN pc.sector <> ''
                  AND (
                    lower(coalesce(p.category, '')) LIKE '%' || lower(pc.sector) || '%'
                    OR lower(coalesce(p.content, '')) LIKE '%' || lower(pc.sector) || '%'
                  )
                THEN 30 ELSE 0
              END
            + CASE
                WHEN pc.city <> ''
                  AND lower(coalesce(p.content, '')) LIKE '%' || lower(pc.city) || '%'
                THEN 12 ELSE 0
              END
            + CASE
                WHEN pc.province <> ''
                  AND lower(coalesce(p.content, '')) LIKE '%' || lower(pc.province) || '%'
                THEN 8 ELSE 0
              END
            + CASE
                WHEN p.content_type IN ('advice', 'career_tip') AND pc.years_experience >= 3
                THEN 10 ELSE 0
              END
            + LEAST(
                20,
                (
                  SELECT COUNT(*)::INT * 4
                  FROM skill_names sn
                  WHERE lower(coalesce(p.content, '')) LIKE '%' || sn.name || '%'
                )
              )
            + CASE
                WHEN jsonb_array_length(coalesce(pc.job_preferences -> 'keywords', '[]'::jsonb)) > 0
                  AND EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(coalesce(pc.job_preferences -> 'keywords', '[]'::jsonb)) kw
                    WHERE lower(coalesce(p.content, '')) LIKE '%' || lower(kw) || '%'
                  )
                THEN 15 ELSE 0
              END
          )::INT AS relevance_score,
          p.created_at AS sort_at,
          to_jsonb(p) AS payload
        FROM public.posts p
        LEFT JOIN profile_ctx pc ON true
        LEFT JOIN followed_ids fd ON fd.target_id = p.author_id
        WHERE coalesce(p.is_hidden, false) = false
          AND public.is_public_app_user(p.author_id)
      ) scored
      WHERE scored.relevance_score >= 12 OR EXISTS (
        SELECT 1 FROM followed_ids fd WHERE fd.target_id = (scored.payload ->> 'author_id')::UUID
      )
      ORDER BY scored.relevance_score DESC, scored.sort_at DESC
      OFFSET v_off
      LIMIT v_pool
    ),
    jobs_pool AS (
      SELECT
        ('job:' || j.id::TEXT) AS item_key,
        'job'::TEXT AS content_type,
        jm.score::INT AS relevance_score,
        j.created_at AS sort_at,
        jsonb_build_object(
          'job', to_jsonb(j),
          'match_score', jm.score,
          'company_id', j.company_id
        ) AS payload
      FROM public.job_matches jm
      INNER JOIN public.jobs j ON j.id = jm.job_id
      WHERE jm.user_id = p_user_id
        AND j.status = 'active'
        AND coalesce(j.admin_hidden, false) = false
      ORDER BY jm.score DESC, j.created_at DESC
      OFFSET v_off
      LIMIT v_pool
    ),
    news_pool AS (
      SELECT
        ('news:' || n.id::TEXT) AS item_key,
        'news'::TEXT AS content_type,
        (15 + n.promotion_weight)::INT AS relevance_score,
        n.published_at AS sort_at,
        to_jsonb(n) AS payload
      FROM public.news_articles n
      WHERE n.is_active = true
        AND n.category IN ('employment', 'tech', 'ai', 'business', 'economy', 'labor')
      ORDER BY n.published_at DESC
      OFFSET floor(v_off / 2)
      LIMIT GREATEST(floor(v_pool / 2), 1)
    ),
    events_pool AS (
      SELECT
        ('event:' || e.id::TEXT) AS item_key,
        'event'::TEXT AS content_type,
        (10 + e.promotion_weight)::INT AS relevance_score,
        e.starts_at AS sort_at,
        to_jsonb(e) AS payload
      FROM public.feed_events e
      WHERE e.is_active = true
        AND e.starts_at >= NOW() - INTERVAL '7 days'
      ORDER BY e.starts_at ASC
      OFFSET floor(v_off / 3)
      LIMIT GREATEST(floor(v_pool / 3), 1)
    ),
    courses_pool AS (
      SELECT
        ('course:' || c.id::TEXT) AS item_key,
        'course'::TEXT AS content_type,
        (8 + c.promotion_weight)::INT AS relevance_score,
        c.created_at AS sort_at,
        to_jsonb(c) AS payload
      FROM public.feed_courses c
      WHERE c.is_active = true
      ORDER BY c.created_at DESC
      OFFSET floor(v_off / 3)
      LIMIT GREATEST(floor(v_pool / 3), 1)
    ),
    pooled AS (
      SELECT * FROM posts_pool
      UNION ALL SELECT * FROM jobs_pool
      UNION ALL SELECT * FROM news_pool
      UNION ALL SELECT * FROM events_pool
      UNION ALL SELECT * FROM courses_pool
    )
    SELECT * FROM pooled
    ORDER BY relevance_score DESC, sort_at DESC
    LIMIT v_pool;

  ELSIF v_feed_mode = 'institution' THEN
    RETURN QUERY
    WITH
    posts_pool AS (
      SELECT
        ('post:' || p.id::TEXT) AS item_key,
        'post'::TEXT AS content_type,
        (
          14
          + CASE
              WHEN v_sector <> ''
                AND (
                  lower(coalesce(p.category, '')) LIKE '%' || lower(v_sector) || '%'
                  OR lower(coalesce(p.content, '')) LIKE '%' || lower(v_sector) || '%'
                )
              THEN 25 ELSE 0
            END
          + CASE WHEN p.category IN ('education', 'scholarship', 'program') THEN 20 ELSE 0 END
        )::INT AS relevance_score,
        p.created_at AS sort_at,
        to_jsonb(p) AS payload
      FROM public.posts p
      WHERE coalesce(p.is_hidden, false) = false
        AND public.is_public_app_user(p.author_id)
        AND (
          p.author_type IN ('business', 'organization')
          OR p.category IN ('education', 'scholarship', 'program')
        )
      ORDER BY relevance_score DESC, p.created_at DESC
      OFFSET v_off
      LIMIT v_pool
    ),
    news_pool AS (
      SELECT
        ('news:' || n.id::TEXT) AS item_key,
        'news'::TEXT AS content_type,
        (18 + n.promotion_weight)::INT AS relevance_score,
        n.published_at AS sort_at,
        to_jsonb(n) AS payload
      FROM public.news_articles n
      WHERE n.is_active = true
        AND n.category IN ('education', 'employment', 'economy')
      ORDER BY n.published_at DESC
      OFFSET floor(v_off / 2)
      LIMIT GREATEST(floor(v_pool / 2), 1)
    ),
    events_pool AS (
      SELECT
        ('event:' || e.id::TEXT) AS item_key,
        'event'::TEXT AS content_type,
        (12 + e.promotion_weight)::INT AS relevance_score,
        e.starts_at AS sort_at,
        to_jsonb(e) AS payload
      FROM public.feed_events e
      WHERE e.is_active = true
        AND e.starts_at >= NOW() - INTERVAL '30 days'
      ORDER BY e.starts_at ASC
      OFFSET floor(v_off / 3)
      LIMIT GREATEST(floor(v_pool / 3), 1)
    ),
    courses_pool AS (
      SELECT
        ('course:' || c.id::TEXT) AS item_key,
        'course'::TEXT AS content_type,
        (14 + c.promotion_weight)::INT AS relevance_score,
        c.created_at AS sort_at,
        to_jsonb(c) AS payload
      FROM public.feed_courses c
      WHERE c.is_active = true
        AND coalesce(c.category, '') IN ('scholarship', 'certification', 'program', 'education', '')
      ORDER BY c.created_at DESC
      OFFSET floor(v_off / 3)
      LIMIT GREATEST(floor(v_pool / 3), 1)
    ),
    pooled AS (
      SELECT * FROM posts_pool
      UNION ALL SELECT * FROM news_pool
      UNION ALL SELECT * FROM events_pool
      UNION ALL SELECT * FROM courses_pool
    )
    SELECT * FROM pooled
    ORDER BY relevance_score DESC, sort_at DESC
    LIMIT v_pool;

  ELSE
    RETURN QUERY
    WITH
    posts_pool AS (
      SELECT
        ('post:' || p.id::TEXT) AS item_key,
        CASE
          WHEN p.content_type = 'hiring_trend' THEN 'advice'
          ELSE 'post'
        END AS content_type,
        (
          CASE
            WHEN p.author_type = 'personal' THEN 16
            WHEN p.content_type = 'hiring_trend' THEN 18
            ELSE 12
          END
          + CASE
              WHEN v_sector <> ''
                AND (
                  lower(coalesce(p.content, '')) LIKE '%' || lower(v_sector) || '%'
                  OR lower(coalesce(p.category, '')) LIKE '%' || lower(v_sector) || '%'
                )
              THEN 25 ELSE 0
            END
          + CASE WHEN p.content_type = 'hiring_trend' THEN 10 ELSE 0 END
        )::INT AS relevance_score,
        p.created_at AS sort_at,
        to_jsonb(p) AS payload
      FROM public.posts p
      WHERE coalesce(p.is_hidden, false) = false
        AND public.is_public_app_user(p.author_id)
      ORDER BY relevance_score DESC, p.created_at DESC
      OFFSET v_off
      LIMIT v_pool
    ),
    news_pool AS (
      SELECT
        ('news:' || n.id::TEXT) AS item_key,
        'news'::TEXT AS content_type,
        (15 + n.promotion_weight)::INT AS relevance_score,
        n.published_at AS sort_at,
        to_jsonb(n) AS payload
      FROM public.news_articles n
      WHERE n.is_active = true
        AND n.category IN ('employment', 'tech', 'ai', 'business', 'economy', 'labor')
      ORDER BY n.published_at DESC
      OFFSET floor(v_off / 2)
      LIMIT GREATEST(floor(v_pool / 2), 1)
    ),
    events_pool AS (
      SELECT
        ('event:' || e.id::TEXT) AS item_key,
        'event'::TEXT AS content_type,
        (10 + e.promotion_weight)::INT AS relevance_score,
        e.starts_at AS sort_at,
        to_jsonb(e) AS payload
      FROM public.feed_events e
      WHERE e.is_active = true
        AND e.starts_at >= NOW() - INTERVAL '14 days'
      ORDER BY e.starts_at ASC
      OFFSET floor(v_off / 3)
      LIMIT GREATEST(floor(v_pool / 3), 1)
    ),
    courses_pool AS (
      SELECT
        ('course:' || c.id::TEXT) AS item_key,
        'course'::TEXT AS content_type,
        (8 + c.promotion_weight)::INT AS relevance_score,
        c.created_at AS sort_at,
        to_jsonb(c) AS payload
      FROM public.feed_courses c
      WHERE c.is_active = true
      ORDER BY c.created_at DESC
      OFFSET floor(v_off / 3)
      LIMIT GREATEST(floor(v_pool / 3), 1)
    ),
    pooled AS (
      SELECT * FROM posts_pool
      UNION ALL SELECT * FROM news_pool
      UNION ALL SELECT * FROM events_pool
      UNION ALL SELECT * FROM courses_pool
    )
    SELECT * FROM pooled
    ORDER BY relevance_score DESC, sort_at DESC
    LIMIT v_pool;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_personalized_feed(UUID, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_personalized_feed(UUID, TEXT, INT, INT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
