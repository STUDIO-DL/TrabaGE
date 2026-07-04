-- =============================================
-- 042_feed_search_discovery.sql
-- Feed/search discovery: post FTS, unified search RPC and filter indexes.
-- =============================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS fts tsvector;

CREATE OR REPLACE FUNCTION public.update_posts_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(NEW.content, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.author_type, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tsvector_update_posts ON public.posts;
CREATE TRIGGER tsvector_update_posts
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_posts_fts();

CREATE INDEX IF NOT EXISTS posts_fts_idx
  ON public.posts USING gin (fts);

CREATE INDEX IF NOT EXISTS posts_author_created_idx
  ON public.posts (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS posts_type_created_idx
  ON public.posts (author_type, created_at DESC);

UPDATE public.posts SET id = id;

CREATE INDEX IF NOT EXISTS jobs_discovery_filter_idx
  ON public.jobs (status, admin_hidden, city, job_type, work_mode, created_at DESC);

CREATE INDEX IF NOT EXISTS company_profiles_sector_active_idx
  ON public.company_profiles (sector, is_active, city);

CREATE OR REPLACE FUNCTION public.search_discovery(
  p_query TEXT,
  p_limit INT DEFAULT 8
)
RETURNS TABLE (
  result_type TEXT,
  result_id UUID,
  title TEXT,
  subtitle TEXT,
  path TEXT,
  avatar_path TEXT,
  rank REAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT := trim(coalesce(p_query, ''));
  v_fts tsquery;
BEGIN
  IF v_query = '' THEN
    RETURN;
  END IF;

  v_fts := websearch_to_tsquery('spanish', v_query);

  RETURN QUERY
  WITH ranked AS (
    SELECT
      'job'::TEXT AS result_type,
      j.id AS result_id,
      j.title,
      concat_ws(' • ', co.company_name, j.city) AS subtitle,
      ('/jobs/' || j.id::TEXT) AS path,
      co.logo_path AS avatar_path,
      (ts_rank(j.fts, v_fts) + 0.30)::REAL AS rank,
      j.created_at
    FROM public.jobs j
    JOIN public.company_profiles co ON co.user_id = j.company_id
    WHERE j.status = 'active'
      AND coalesce(j.admin_hidden, false) = false
      AND j.fts @@ v_fts

    UNION ALL

    SELECT
      'company'::TEXT AS result_type,
      co.user_id AS result_id,
      co.company_name AS title,
      concat_ws(' • ', co.sector, co.city) AS subtitle,
      ('/companies/' || co.user_id::TEXT) AS path,
      co.logo_path AS avatar_path,
      (ts_rank(co.fts, v_fts) + 0.20)::REAL AS rank,
      co.created_at
    FROM public.company_profiles co
    WHERE coalesce(co.is_active, true) = true
      AND co.fts @@ v_fts

    UNION ALL

    SELECT
      'candidate'::TEXT AS result_type,
      cp.user_id AS result_id,
      cp.full_name AS title,
      concat_ws(' • ', cp.headline, cp.city) AS subtitle,
      ('/profile/' || cp.user_id::TEXT) AS path,
      cp.avatar_path AS avatar_path,
      (ts_rank(cp.fts, v_fts) + 0.10)::REAL AS rank,
      cp.created_at
    FROM public.candidate_profiles cp
    WHERE coalesce(cp.is_active, true) = true
      AND cp.fts @@ v_fts

    UNION ALL

    SELECT
      'post'::TEXT AS result_type,
      p.id AS result_id,
      left(p.content, 90) AS title,
      CASE
        WHEN p.author_type = 'company' THEN 'Publicación de empresa'
        ELSE 'Publicación de candidato'
      END AS subtitle,
      ('/feed/post/' || p.id::TEXT) AS path,
      NULL::TEXT AS avatar_path,
      ts_rank(p.fts, v_fts)::REAL AS rank,
      p.created_at
    FROM public.posts p
    WHERE p.fts @@ v_fts
  )
  SELECT *
  FROM ranked
  WHERE title IS NOT NULL AND trim(title) <> ''
  ORDER BY rank DESC, created_at DESC
  LIMIT p_limit * 4;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_discovery(TEXT, INT) TO authenticated;
