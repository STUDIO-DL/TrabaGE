-- =============================================
-- 060_intelligent_feed.sql
-- Intelligent professional feed v1: unified content pools, RPC, RLS.
-- Scores are internal only (never shown in UI).
-- Architecture hooks: promotion_weight, is_sponsored for future sponsored/AI ranking.
-- =============================================

-- Extend posts for typed feed content (advice, hiring trends, etc.)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'post',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS promotion_weight SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_content_type_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_content_type_check
  CHECK (content_type IN ('post', 'advice', 'hiring_trend', 'career_tip'));

CREATE INDEX IF NOT EXISTS posts_content_type_created_idx
  ON public.posts (content_type, created_at DESC)
  WHERE coalesce(is_hidden, false) = false;

-- Admin-curated news articles
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  category TEXT NOT NULL CHECK (
    category IN ('employment', 'tech', 'ai', 'business', 'economy', 'education', 'labor')
  ),
  source TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_created BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  promotion_weight SMALLINT NOT NULL DEFAULT 0,
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS news_articles_active_published_idx
  ON public.news_articles (is_active, published_at DESC);

CREATE INDEX IF NOT EXISTS news_articles_category_active_idx
  ON public.news_articles (category, is_active, published_at DESC);

-- Events (job fairs, webinars, etc.)
CREATE TABLE IF NOT EXISTS public.feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('job_fair', 'congress', 'webinar', 'hackathon', 'career_day', 'other')
  ),
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  organizer_type TEXT CHECK (organizer_type IN ('company', 'institution', 'admin')),
  organizer_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  promotion_weight SMALLINT NOT NULL DEFAULT 0,
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_events_active_starts_idx
  ON public.feed_events (is_active, starts_at ASC);

CREATE INDEX IF NOT EXISTS feed_events_type_active_idx
  ON public.feed_events (event_type, is_active, starts_at ASC);

-- Courses / scholarships (architecture only — no external API integration)
CREATE TABLE IF NOT EXISTS public.feed_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  provider TEXT,
  url TEXT,
  category TEXT,
  skills_tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  promotion_weight SMALLINT NOT NULL DEFAULT 0,
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_courses_active_created_idx
  ON public.feed_courses (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS feed_courses_category_active_idx
  ON public.feed_courses (category, is_active, created_at DESC);

-- Optional cache for precomputed suggestions (architecture hook)
CREATE TABLE IF NOT EXISTS public.feed_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (
    suggestion_type IN ('company', 'institution', 'candidate', 'person')
  ),
  target_id UUID NOT NULL,
  score SMALLINT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, suggestion_type, target_id)
);

CREATE INDEX IF NOT EXISTS feed_suggestions_user_type_score_idx
  ON public.feed_suggestions (user_id, suggestion_type, score DESC);

-- RLS: public read for active content, admin write
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active news" ON public.news_articles;
CREATE POLICY "Public read active news"
ON public.news_articles FOR SELECT TO authenticated, anon
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin manage news" ON public.news_articles;
CREATE POLICY "Admin manage news"
ON public.news_articles FOR ALL TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Public read active events" ON public.feed_events;
CREATE POLICY "Public read active events"
ON public.feed_events FOR SELECT TO authenticated, anon
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin manage events" ON public.feed_events;
CREATE POLICY "Admin manage events"
ON public.feed_events FOR ALL TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Public read active courses" ON public.feed_courses;
CREATE POLICY "Public read active courses"
ON public.feed_courses FOR SELECT TO authenticated, anon
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin manage courses" ON public.feed_courses;
CREATE POLICY "Admin manage courses"
ON public.feed_courses FOR ALL TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Users read own feed suggestions" ON public.feed_suggestions;
CREATE POLICY "Users read own feed suggestions"
ON public.feed_suggestions FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages feed suggestions" ON public.feed_suggestions;
CREATE POLICY "Service role manages feed suggestions"
ON public.feed_suggestions FOR ALL TO service_role
USING (TRUE)
WITH CHECK (TRUE);

GRANT SELECT ON public.news_articles TO authenticated, anon;
GRANT SELECT ON public.feed_events TO authenticated, anon;
GRANT SELECT ON public.feed_courses TO authenticated, anon;
GRANT SELECT ON public.feed_suggestions TO authenticated;
GRANT ALL ON public.news_articles TO service_role;
GRANT ALL ON public.feed_events TO service_role;
GRANT ALL ON public.feed_courses TO service_role;
GRANT ALL ON public.feed_suggestions TO service_role;

-- Unified feed pool RPC (batched queries, no N+1 per item).
-- Diversity interleaving is applied client-side in feedRanking.js.
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
