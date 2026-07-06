-- =============================================
-- 061_production_hardening.sql
-- RPC auth guard, candidate_links anon read, feed query index.
-- =============================================

-- Prevent authenticated users from reading another user's personalized feed pool.
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

  IF p_role = 'company' AND p_user_id IS NOT NULL THEN
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
    posts_pool AS (
      SELECT
        ('post:' || p.id::TEXT) AS item_key,
        CASE
          WHEN p.content_type IN ('advice', 'career_tip') THEN 'advice'
          ELSE 'post'
        END AS content_type,
        12 AS relevance_score,
        p.created_at AS sort_at,
        to_jsonb(p) AS payload
      FROM public.posts p
      WHERE coalesce(p.is_hidden, false) = false
      ORDER BY p.created_at DESC
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
        14 AS relevance_score,
        p.created_at AS sort_at,
        to_jsonb(p) AS payload
      FROM public.posts p
      WHERE coalesce(p.is_hidden, false) = false
        AND (
          p.author_type = 'company'
          OR p.category IN ('education', 'scholarship', 'program')
        )
      ORDER BY p.created_at DESC
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
        CASE
          WHEN p.author_type = 'candidate' THEN 16
          WHEN p.content_type = 'hiring_trend' THEN 18
          ELSE 12
        END AS relevance_score,
        p.created_at AS sort_at,
        to_jsonb(p) AS payload
      FROM public.posts p
      WHERE coalesce(p.is_hidden, false) = false
      ORDER BY p.created_at DESC
      OFFSET v_off
      LIMIT v_pool
    ),
    news_pool AS (
      SELECT
        ('news:' || n.id::TEXT) AS item_key,
        'news'::TEXT AS content_type,
        (14 + n.promotion_weight)::INT AS relevance_score,
        n.published_at AS sort_at,
        to_jsonb(n) AS payload
      FROM public.news_articles n
      WHERE n.is_active = true
        AND n.category IN ('employment', 'labor', 'business', 'economy', 'tech')
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
    candidates_pool AS (
      SELECT
        ('candidate:' || jcm.candidate_id::TEXT || ':' || jcm.job_id::TEXT) AS item_key,
        'recommendation_card'::TEXT AS content_type,
        jcm.score::INT AS relevance_score,
        jcm.created_at AS sort_at,
        jsonb_build_object(
          'subtype', 'candidate',
          'candidate_id', jcm.candidate_id,
          'job_id', jcm.job_id,
          'match_score', jcm.score
        ) AS payload
      FROM public.job_candidate_matches jcm
      INNER JOIN public.jobs j ON j.id = jcm.job_id
      WHERE j.company_id = p_user_id
        AND j.status = 'active'
        AND coalesce(j.admin_hidden, false) = false
      ORDER BY jcm.score DESC, jcm.created_at DESC
      OFFSET v_off
      LIMIT GREATEST(floor(v_pool / 2), 1)
    ),
    companies_pool AS (
      SELECT
        ('company:' || co.user_id::TEXT) AS item_key,
        'recommendation_card'::TEXT AS content_type,
        10 AS relevance_score,
        co.created_at AS sort_at,
        jsonb_build_object(
          'subtype', 'company',
          'company_id', co.user_id,
          'sector', co.sector
        ) AS payload
      FROM public.company_profiles co
      WHERE co.is_active = true
        AND co.user_id <> p_user_id
        AND coalesce(co.sector, '') = coalesce(v_sector, co.sector, '')
        AND coalesce(co.company_type, '') NOT IN ('Institucion publica', 'ONG')
      ORDER BY co.created_at DESC
      OFFSET floor(v_off / 4)
      LIMIT GREATEST(floor(v_pool / 4), 1)
    ),
    pooled AS (
      SELECT * FROM posts_pool
      UNION ALL SELECT * FROM news_pool
      UNION ALL SELECT * FROM events_pool
      UNION ALL SELECT * FROM candidates_pool
      UNION ALL SELECT * FROM companies_pool
    )
    SELECT * FROM pooled
    ORDER BY relevance_score DESC, sort_at DESC
    LIMIT v_pool;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_personalized_feed(UUID, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_personalized_feed(UUID, TEXT, INT, INT) TO authenticated, service_role;

-- Align candidate_links visibility with other profile sections (guest/preview read).
DROP POLICY IF EXISTS "Public read candidate links of active profiles" ON public.candidate_links;
CREATE POLICY "Public read candidate links of active profiles"
ON public.candidate_links FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = candidate_links.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

GRANT SELECT ON public.candidate_links TO anon;
