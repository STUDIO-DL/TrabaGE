-- =============================================
-- 088_admin_account_invisibility.sql
-- Hide admin accounts from all public app surfaces:
-- search, profiles, feed posts, follower lists, and directory views.
-- Admin panel (admin_list_users) already excludes admins.
-- =============================================

-- ─── 1. Helper: visible to regular app users (not admin) ─────────────────────

CREATE OR REPLACE FUNCTION public.is_public_app_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = p_user_id
        AND lower(coalesce(ur.role, '')) = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_public_app_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_app_user(UUID) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.is_public_app_user(UUID) IS
  'True when the user is not an admin and may appear in public app surfaces.';

-- ─── 2. Public directory views ───────────────────────────────────────────────

DROP VIEW IF EXISTS public.candidate_profiles_public CASCADE;

CREATE OR REPLACE VIEW public.candidate_profiles_public
WITH (security_invoker = false) AS
SELECT
  cp.user_id,
  cp.full_name,
  cp.headline,
  cp.about,
  cp.city,
  cp.province,
  cp.country,
  cp.sector,
  cp.avatar_path,
  cp.cover_path,
  cp.years_experience,
  cp.show_education_in_intro,
  cp.intro_education_id,
  cp.contact_email,
  cp.contact_whatsapp,
  cp.social_links,
  cp.setup_complete,
  cp.is_active,
  cp.created_at,
  cp.updated_at
FROM public.candidate_profiles cp
WHERE coalesce(cp.is_active, true) = true
  AND public.is_public_app_user(cp.user_id);

DROP VIEW IF EXISTS public.company_profiles_public CASCADE;

CREATE OR REPLACE VIEW public.company_profiles_public
WITH (security_invoker = false) AS
SELECT
  co.user_id,
  co.company_name,
  co.company_type,
  co.sector,
  co.description,
  co.intro,
  co.city,
  co.country,
  co.address,
  co.website,
  co.founded_year,
  co.company_size,
  co.logo_path,
  co.cover_path,
  co.contact_name,
  co.contact_role,
  co.contact_email,
  co.contact_phone,
  co.contact_whatsapp,
  co.social_links,
  co.is_verified,
  co.verification_status,
  co.verified_status,
  co.setup_complete,
  co.is_active,
  co.created_at,
  co.updated_at
FROM public.company_profiles co
WHERE coalesce(co.is_active, true) = true
  AND public.is_public_app_user(co.user_id);

REVOKE ALL ON public.candidate_profiles_public FROM PUBLIC;
REVOKE ALL ON public.company_profiles_public FROM PUBLIC;
GRANT SELECT ON public.candidate_profiles_public TO anon, authenticated, service_role;
GRANT SELECT ON public.company_profiles_public TO anon, authenticated, service_role;

-- ─── 3. RLS: hide admin content from non-admin readers ───────────────────────

DROP POLICY IF EXISTS "Public read posts" ON public.posts;
CREATE POLICY "Public read posts" ON public.posts
  FOR SELECT
  USING (
    is_hidden = FALSE
    AND public.is_public_app_user(author_id)
  );

DROP POLICY IF EXISTS "Public read active companies" ON public.company_profiles;
CREATE POLICY "Public read active companies"
ON public.company_profiles FOR SELECT
USING (
  coalesce(is_active, true) = true
  AND public.is_public_app_user(user_id)
);

DROP POLICY IF EXISTS "Companies can read applicant profiles" ON public.candidate_profiles;
CREATE POLICY "Companies can read applicant profiles"
ON public.candidate_profiles FOR SELECT TO authenticated
USING (
  public.is_active_company(auth.uid())
  AND public.is_public_app_user(candidate_profiles.user_id)
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = candidate_profiles.user_id
      AND j.company_id = auth.uid()
  )
);

-- ─── 4. search_candidates ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_candidates(keyword TEXT, p_limit INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  headline TEXT,
  city TEXT,
  avatar_path TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  fts_query TSQUERY;
  v_limit INT := LEAST(GREATEST(coalesce(p_limit, 20), 1), 50);
BEGIN
  IF keyword IS NULL OR char_length(trim(keyword)) < 2 THEN
    RETURN;
  END IF;

  BEGIN
    fts_query := websearch_to_tsquery('spanish', keyword);
  EXCEPTION
    WHEN OTHERS THEN
      fts_query := NULL;
  END;

  RETURN QUERY
  SELECT
    cp.user_id,
    cp.full_name,
    cp.headline,
    cp.city,
    cp.avatar_path
  FROM public.candidate_profiles AS cp
  WHERE coalesce(cp.is_active, true) = true
    AND public.is_public_app_user(cp.user_id)
    AND (
      (fts_query IS NOT NULL AND cp.fts @@ fts_query)
      OR cp.full_name ILIKE ('%' || keyword || '%')
      OR cp.headline ILIKE ('%' || keyword || '%')
      OR cp.city ILIKE ('%' || keyword || '%')
    )
  ORDER BY
    CASE WHEN fts_query IS NOT NULL THEN ts_rank(cp.fts, fts_query) ELSE 0 END DESC,
    cp.updated_at DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

-- ─── 5. search_discovery ─────────────────────────────────────────────────────

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
      AND coalesce(co.is_active, true) = true
      AND public.is_public_app_user(co.user_id)
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
      AND public.is_public_app_user(co.user_id)
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
      AND public.is_public_app_user(cp.user_id)
      AND cp.fts @@ v_fts

    UNION ALL

    SELECT
      'post'::TEXT AS result_type,
      p.id AS result_id,
      left(p.content, 90) AS title,
      CASE
        WHEN p.author_type = 'company' THEN 'Publicacion de empresa'
        ELSE 'Publicacion de candidato'
      END AS subtitle,
      ('/feed/post/' || p.id::TEXT) AS path,
      NULL::TEXT AS avatar_path,
      ts_rank(p.fts, v_fts)::REAL AS rank,
      p.created_at
    FROM public.posts p
    WHERE p.fts @@ v_fts
      AND coalesce(p.is_hidden, false) = false
      AND public.is_public_app_user(p.author_id)
  )
  SELECT *
  FROM ranked
  WHERE title IS NOT NULL AND trim(title) <> ''
  ORDER BY rank DESC, created_at DESC
  LIMIT p_limit * 4;
END;
$$;

-- ─── 6. global_search (candidate branch only patched) ────────────────────────

CREATE OR REPLACE FUNCTION public.global_search(
  p_query text,
  p_limit_per_type integer DEFAULT 5
)
RETURNS TABLE (
  result_type text,
  result_id uuid,
  title text,
  subtitle text,
  path text,
  avatar_path text,
  rank real,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = on
AS $$
DECLARE
  v_query text;
  v_norm text;
  v_tsquery tsquery;
  v_limit integer := greatest(coalesce(p_limit_per_type, 5), 1);
BEGIN
  v_query := trim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'));
  IF v_query = '' THEN
    RETURN;
  END IF;

  v_norm := public.normalize_search_text(v_query);
  v_tsquery := public.build_search_tsquery(v_query);

  RETURN QUERY
  SELECT
    s.result_type,
    s.result_id,
    s.title,
    s.subtitle,
    s.path,
    s.avatar_path,
    s.rank,
    s.created_at
  FROM (
    WITH candidates AS (
      SELECT
        'candidate'::text AS result_type,
        cp.user_id AS result_id,
        cp.full_name AS title,
        concat_ws(' • ', cp.headline, cp.city) AS subtitle,
        ('/profile/' || cp.user_id::text) AS path,
        cp.avatar_path,
        public.search_match_rank(cp.full_name, v_query, cp.fts, v_tsquery, 0.15::real) AS rank,
        cp.created_at
      FROM public.candidate_profiles cp
      WHERE coalesce(cp.is_active, true) = true
        AND public.is_public_app_user(cp.user_id)
        AND (
          (v_tsquery IS NOT NULL AND cp.fts @@ v_tsquery)
          OR public.f_unaccent(cp.full_name) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.headline, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.about, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.city, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.country, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.job_preferences, '{}'::jsonb)::text) ILIKE '%' || v_norm || '%'
          OR EXISTS (
            SELECT 1
            FROM unnest(regexp_split_to_array(coalesce(cp.full_name, ''), '\s+')) AS name_part(word)
            WHERE public.f_unaccent(name_part.word) ILIKE v_norm || '%'
          )
          OR EXISTS (
            SELECT 1 FROM public.skills s
            WHERE s.user_id = cp.user_id
              AND public.f_unaccent(s.name) ILIKE '%' || v_norm || '%'
          )
          OR EXISTS (
            SELECT 1 FROM public.experience e
            WHERE e.user_id = cp.user_id
              AND (
                public.f_unaccent(e.position) ILIKE '%' || v_norm || '%'
                OR public.f_unaccent(coalesce(e.company, '')) ILIKE '%' || v_norm || '%'
                OR public.f_unaccent(coalesce(e.description, '')) ILIKE '%' || v_norm || '%'
              )
          )
          OR EXISTS (
            SELECT 1 FROM public.education ed
            WHERE ed.user_id = cp.user_id
              AND (
                public.f_unaccent(ed.institution) ILIKE '%' || v_norm || '%'
                OR public.f_unaccent(coalesce(ed.program, '')) ILIKE '%' || v_norm || '%'
              )
          )
          OR EXISTS (
            SELECT 1 FROM public.services sv
            WHERE sv.user_id = cp.user_id
              AND public.f_unaccent(sv.name) ILIKE '%' || v_norm || '%'
          )
          OR EXISTS (
            SELECT 1 FROM public.languages lg
            WHERE lg.user_id = cp.user_id
              AND public.f_unaccent(lg.language) ILIKE '%' || v_norm || '%'
          )
          OR EXISTS (
            SELECT 1 FROM public.certifications ct
            WHERE ct.user_id = cp.user_id
              AND (
                public.f_unaccent(ct.name) ILIKE '%' || v_norm || '%'
                OR public.f_unaccent(coalesce(ct.issuer, '')) ILIKE '%' || v_norm || '%'
              )
          )
        )
      ORDER BY rank DESC NULLS LAST, cp.created_at DESC
      LIMIT v_limit
    ),
    companies AS (
      SELECT
        'company'::text AS result_type,
        co.user_id AS result_id,
        co.company_name AS title,
        concat_ws(' • ', co.sector, co.city) AS subtitle,
        ('/companies/' || co.user_id::text) AS path,
        co.logo_path AS avatar_path,
        public.search_match_rank(co.company_name, v_query, co.fts, v_tsquery, 0.25::real) AS rank,
        co.created_at
      FROM public.company_profiles co
      WHERE coalesce(co.is_active, true) = true
        AND public.is_public_app_user(co.user_id)
        AND coalesce(co.company_type, '') NOT IN ('Institucion publica', 'ONG')
        AND (
          (v_tsquery IS NOT NULL AND co.fts @@ v_tsquery)
          OR public.f_unaccent(co.company_name) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.sector, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.description, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.city, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.country, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.company_type, '')) ILIKE '%' || v_norm || '%'
        )
      ORDER BY rank DESC NULLS LAST, co.created_at DESC
      LIMIT v_limit
    ),
    institutions AS (
      SELECT
        'institution'::text AS result_type,
        co.user_id AS result_id,
        co.company_name AS title,
        concat_ws(' • ', coalesce(co.company_type, 'Institución'), co.city) AS subtitle,
        ('/companies/' || co.user_id::text) AS path,
        co.logo_path AS avatar_path,
        public.search_match_rank(co.company_name, v_query, co.fts, v_tsquery, 0.20::real) AS rank,
        co.created_at
      FROM public.company_profiles co
      WHERE coalesce(co.is_active, true) = true
        AND public.is_public_app_user(co.user_id)
        AND coalesce(co.company_type, '') IN ('Institucion publica', 'ONG')
        AND (
          (v_tsquery IS NOT NULL AND co.fts @@ v_tsquery)
          OR public.f_unaccent(co.company_name) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.sector, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.description, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.city, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.company_type, '')) ILIKE '%' || v_norm || '%'
        )
      ORDER BY rank DESC NULLS LAST, co.created_at DESC
      LIMIT v_limit
    ),
    jobs AS (
      SELECT
        'job'::text AS result_type,
        j.id AS result_id,
        j.title,
        concat_ws(' • ', co.company_name, j.city) AS subtitle,
        ('/jobs/' || j.id::text) AS path,
        co.logo_path AS avatar_path,
        public.search_match_rank(j.title, v_query, j.fts, v_tsquery, 0.30::real) AS rank,
        j.created_at
      FROM public.jobs j
      JOIN public.company_profiles co ON co.user_id = j.company_id
      WHERE j.status = 'active'
        AND coalesce(j.admin_hidden, false) = false
        AND coalesce(co.is_active, true) = true
        AND public.is_public_app_user(co.user_id)
        AND (
          (v_tsquery IS NOT NULL AND j.fts @@ v_tsquery)
          OR public.f_unaccent(j.title) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(j.description, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(j.requirements, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(j.city, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(j.country, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(j.sector, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(co.company_name, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(j.job_type, '')) ILIKE '%' || v_norm || '%'
          OR EXISTS (
            SELECT 1
            FROM unnest(coalesce(j.required_skills, ARRAY[]::text[])) AS skill(name)
            WHERE public.f_unaccent(skill.name) ILIKE '%' || v_norm || '%'
          )
        )
      ORDER BY rank DESC NULLS LAST, j.created_at DESC
      LIMIT v_limit
    )
    SELECT * FROM candidates
    UNION ALL
    SELECT * FROM companies
    UNION ALL
    SELECT * FROM institutions
    UNION ALL
    SELECT * FROM jobs
  ) AS s
  ORDER BY
    CASE s.result_type
      WHEN 'candidate' THEN 1
      WHEN 'company' THEN 2
      WHEN 'institution' THEN 3
      WHEN 'job' THEN 4
      ELSE 5
    END,
    s.rank DESC NULLS LAST,
    s.created_at DESC;
END;
$$;

-- ─── 7. Follower listings ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_follower_count(
  p_target_type TEXT,
  p_target_id UUID
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::BIGINT
  FROM public.follows f
  WHERE f.target_type = p_target_type
    AND f.target_id = p_target_id
    AND public.is_public_app_user(f.user_id);
$$;

CREATE OR REPLACE FUNCTION public.get_followers(
  p_target_type TEXT,
  p_target_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  headline TEXT,
  avatar_path TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    auth.uid() = p_target_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
    cp.full_name,
    cp.headline,
    cp.avatar_path,
    f.created_at AS followed_at
  FROM public.follows f
  JOIN public.candidate_profiles cp ON cp.user_id = f.user_id
  WHERE f.target_type = p_target_type
    AND f.target_id = p_target_id
    AND public.is_public_app_user(cp.user_id)
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_followers(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_path TEXT,
  headline TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> p_user_id AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
    cp.full_name,
    cp.avatar_path,
    cp.headline,
    f.created_at AS followed_at
  FROM public.follows f
  JOIN public.candidate_profiles cp ON cp.user_id = f.user_id
  WHERE f.target_id = p_user_id
    AND f.target_type = 'company'
    AND public.is_public_app_user(cp.user_id)
  ORDER BY f.created_at DESC;
END;
$$;

-- ─── 8. Feed RPC: exclude admin-authored posts ───────────────────────────────

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
        AND public.is_public_app_user(p.author_id)
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
        AND public.is_public_app_user(p.author_id)
        AND (
          p.author_type IN ('business', 'organization')
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
          WHEN p.author_type = 'personal' THEN 16
          WHEN p.content_type = 'hiring_trend' THEN 18
          ELSE 12
        END AS relevance_score,
        p.created_at AS sort_at,
        to_jsonb(p) AS payload
      FROM public.posts p
      WHERE coalesce(p.is_hidden, false) = false
        AND public.is_public_app_user(p.author_id)
      ORDER BY p.created_at DESC
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
