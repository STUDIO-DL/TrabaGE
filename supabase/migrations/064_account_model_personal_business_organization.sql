-- =============================================
-- 064_account_model_personal_business_organization.sql
-- Official account model:
--   candidate → personal
--   company (non-org) → business
--   institution / org company_type → organization
-- Tables candidate_profiles / company_profiles keep names (FK surface).
-- Follows: company → business, institution → organization (no follow-people).
-- =============================================

-- ─── 1. user_roles: widen CHECK, migrate data, tighten CHECK ───────────────

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

UPDATE public.user_roles ur
SET role = 'personal'
WHERE ur.role = 'candidate';

UPDATE public.user_roles ur
SET role = 'organization'
WHERE ur.role = 'company'
  AND EXISTS (
    SELECT 1
    FROM public.company_profiles cp
    WHERE cp.user_id = ur.user_id
      AND cp.company_type IN ('Institucion publica', 'ONG')
  );

UPDATE public.user_roles ur
SET role = 'business'
WHERE ur.role = 'company';

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('personal', 'business', 'organization', 'admin'));

-- ─── 2. follows.target_type ────────────────────────────────────────────────

ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_target_type_check;

UPDATE public.follows SET target_type = 'business' WHERE target_type = 'company';
UPDATE public.follows SET target_type = 'organization' WHERE target_type = 'institution';

ALTER TABLE public.follows
  ADD CONSTRAINT follows_target_type_check
  CHECK (target_type IN ('business', 'organization'));

-- ─── 3. posts.author_type ──────────────────────────────────────────────────

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_author_type_check;

UPDATE public.posts SET author_type = 'personal' WHERE author_type = 'candidate';

UPDATE public.posts p
SET author_type = 'organization'
WHERE p.author_type = 'company'
  AND EXISTS (
    SELECT 1
    FROM public.company_profiles cp
    WHERE cp.user_id = p.author_id
      AND cp.company_type IN ('Institucion publica', 'ONG')
  );

UPDATE public.posts SET author_type = 'business' WHERE author_type = 'company';

ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_type_check
  CHECK (author_type IN ('personal', 'business', 'organization'));

-- ─── 4. handle_new_user default role ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := lower(coalesce(NEW.raw_user_meta_data->>'role', 'personal'));
BEGIN
  -- Accept legacy signup metadata during transition.
  IF v_role IN ('candidate') THEN
    v_role := 'personal';
  ELSIF v_role IN ('company') THEN
    v_role := 'business';
  ELSIF v_role IN ('institution') THEN
    v_role := 'organization';
  END IF;

  IF v_role NOT IN ('personal', 'business', 'organization') THEN
    v_role := 'personal';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- ─── 5. set_initial_user_role ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_initial_user_role(p_role TEXT)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT := lower(trim(coalesce(p_role, '')));
  v_current public.user_roles;
  v_has_personal BOOLEAN;
  v_has_employer BOOLEAN;
  v_result public.user_roles;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Legacy aliases from in-flight clients
  IF v_role = 'candidate' THEN v_role := 'personal'; END IF;
  IF v_role = 'company' THEN v_role := 'business'; END IF;
  IF v_role = 'institution' THEN v_role := 'organization'; END IF;

  IF v_role NOT IN ('personal', 'business', 'organization') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT * INTO v_current
  FROM public.user_roles
  WHERE user_id = v_user_id;

  SELECT EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = v_user_id)
  INTO v_has_personal;

  SELECT EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = v_user_id)
  INTO v_has_employer;

  IF v_has_personal AND v_has_employer THEN
    RAISE EXCEPTION 'Account has multiple profile types';
  END IF;

  IF v_has_personal AND v_role <> 'personal' THEN
    RAISE EXCEPTION 'Role already bound to personal profile';
  END IF;

  IF v_has_employer AND v_role NOT IN ('business', 'organization') THEN
    RAISE EXCEPTION 'Role already bound to business/organization profile';
  END IF;

  -- If employer profile exists and role is employer, allow business↔organization
  -- only when no profile yet; once profile exists, lock to current role family.
  IF v_has_employer AND v_current.role IN ('business', 'organization')
     AND v_role IN ('business', 'organization')
     AND v_current.role <> v_role THEN
    -- Allow correcting organization vs business when company_type implies it,
    -- but only before setup is marked complete.
    IF EXISTS (
      SELECT 1 FROM public.company_profiles cp
      WHERE cp.user_id = v_user_id AND coalesce(cp.setup_complete, false) = true
    ) THEN
      RAISE EXCEPTION 'Role cannot be changed after profile setup';
    END IF;
  END IF;

  IF v_current.user_id IS NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_role)
    RETURNING * INTO v_result;
    RETURN v_result;
  END IF;

  IF v_current.role = 'admin' THEN
    RETURN v_current;
  END IF;

  IF v_current.role = v_role THEN
    RETURN v_current;
  END IF;

  IF v_has_personal OR v_has_employer THEN
    -- Employer subtype correction (business ↔ organization) already handled above.
    IF NOT (
      v_has_employer
      AND v_current.role IN ('business', 'organization')
      AND v_role IN ('business', 'organization')
    ) THEN
      RAISE EXCEPTION 'Role cannot be changed after profile setup';
    END IF;
  END IF;

  UPDATE public.user_roles
  SET role = v_role
  WHERE user_id = v_user_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_initial_user_role(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_initial_user_role(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Own role insert" ON public.user_roles;
CREATE POLICY "Own role insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role IN ('personal', 'business', 'organization'));

-- ─── 6. Active-account helpers (keep names for existing RLS) ───────────────

CREATE OR REPLACE FUNCTION public.is_active_candidate(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND ur.role = 'personal'
      AND coalesce(cp.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_company(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.company_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('business', 'organization')
      AND coalesce(cp.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_personal_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_role, '')) IN ('personal', 'candidate');
$$;

CREATE OR REPLACE FUNCTION public.is_employer_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_role, '')) IN ('business', 'organization', 'company');
$$;

-- ─── 7. Profile RLS that hard-coded get_my_role() ──────────────────────────

DROP POLICY IF EXISTS "Own candidate update" ON public.candidate_profiles;
CREATE POLICY "Own candidate update" ON public.candidate_profiles
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.get_my_role() = 'personal'
  AND coalesce(is_active, true) = true
)
WITH CHECK (
  user_id = auth.uid()
  AND public.get_my_role() = 'personal'
  AND coalesce(is_active, true) = true
);

DROP POLICY IF EXISTS "Own candidate delete" ON public.candidate_profiles;
CREATE POLICY "Own candidate delete" ON public.candidate_profiles
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.get_my_role() = 'personal'
  AND coalesce(is_active, true) = true
);

DROP POLICY IF EXISTS "Own company update" ON public.company_profiles;
CREATE POLICY "Own company update" ON public.company_profiles
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.get_my_role() IN ('business', 'organization')
  AND coalesce(is_active, true) = true
)
WITH CHECK (
  user_id = auth.uid()
  AND public.get_my_role() IN ('business', 'organization')
  AND coalesce(is_active, true) = true
);

DROP POLICY IF EXISTS "Own company delete" ON public.company_profiles;
CREATE POLICY "Own company delete" ON public.company_profiles
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.get_my_role() IN ('business', 'organization')
  AND coalesce(is_active, true) = true
);

DROP POLICY IF EXISTS "Own candidate insert" ON public.candidate_profiles;
CREATE POLICY "Own candidate insert" ON public.candidate_profiles
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.get_my_role() = 'personal'
);

DROP POLICY IF EXISTS "Own company insert" ON public.company_profiles;
CREATE POLICY "Own company insert" ON public.company_profiles
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.get_my_role() IN ('business', 'organization')
);

-- ─── 8. Posts RLS author_type ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Auth insert posts" ON public.posts;
CREATE POLICY "Auth insert posts" ON public.posts
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    (author_type = 'personal' AND public.is_active_candidate(auth.uid()))
    OR (author_type IN ('business', 'organization') AND public.is_active_company(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Own update posts" ON public.posts;
CREATE POLICY "Own update posts" ON public.posts
FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  AND (
    (author_type = 'personal' AND public.is_active_candidate(auth.uid()))
    OR (author_type IN ('business', 'organization') AND public.is_active_company(auth.uid()))
  )
)
WITH CHECK (
  author_id = auth.uid()
  AND (
    (author_type = 'personal' AND public.is_active_candidate(auth.uid()))
    OR (author_type IN ('business', 'organization') AND public.is_active_company(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Own delete posts" ON public.posts;
CREATE POLICY "Own delete posts" ON public.posts
FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  AND (
    (author_type = 'personal' AND public.is_active_candidate(auth.uid()))
    OR (author_type IN ('business', 'organization') AND public.is_active_company(auth.uid()))
  )
);

-- ─── 9. Dual-profile guard message ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_dual_profile_types()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'candidate_profiles' THEN
    IF EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'A user cannot have both personal and business/organization profiles';
    END IF;
  ELSIF TG_TABLE_NAME = 'company_profiles' THEN
    IF EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'A user cannot have both personal and business/organization profiles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 10. Global search result types (mirrors 056 with new type labels)
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
    WITH personals AS (
      SELECT
        'personal'::text AS result_type,
        cp.user_id AS result_id,
        cp.full_name AS title,
        concat_ws(' • ', cp.headline, cp.city) AS subtitle,
        ('/profile/' || cp.user_id::text) AS path,
        cp.avatar_path,
        public.search_match_rank(cp.full_name, v_query, cp.fts, v_tsquery, 0.15::real) AS rank,
        cp.created_at
      FROM public.candidate_profiles cp
      WHERE coalesce(cp.is_active, true) = true
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
    businesses AS (
      SELECT
        'business'::text AS result_type,
        co.user_id AS result_id,
        co.company_name AS title,
        concat_ws(' • ', co.sector, co.city) AS subtitle,
        ('/companies/' || co.user_id::text) AS path,
        co.logo_path AS avatar_path,
        public.search_match_rank(co.company_name, v_query, co.fts, v_tsquery, 0.25::real) AS rank,
        co.created_at
      FROM public.company_profiles co
      WHERE coalesce(co.is_active, true) = true
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
    organizations AS (
      SELECT
        'organization'::text AS result_type,
        co.user_id AS result_id,
        co.company_name AS title,
        concat_ws(' • ', coalesce(co.company_type, 'Organización'), co.city) AS subtitle,
        ('/companies/' || co.user_id::text) AS path,
        co.logo_path AS avatar_path,
        public.search_match_rank(co.company_name, v_query, co.fts, v_tsquery, 0.20::real) AS rank,
        co.created_at
      FROM public.company_profiles co
      WHERE coalesce(co.is_active, true) = true
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
    SELECT * FROM personals
    UNION ALL
    SELECT * FROM businesses
    UNION ALL
    SELECT * FROM organizations
    UNION ALL
    SELECT * FROM jobs
  ) AS s
  ORDER BY
    CASE s.result_type
      WHEN 'personal' THEN 1
      WHEN 'business' THEN 2
      WHEN 'organization' THEN 3
      WHEN 'job' THEN 4
      ELSE 5
    END,
    s.rank DESC NULLS LAST,
    s.created_at DESC;
END;
$$;


GRANT EXECUTE ON FUNCTION public.global_search(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(text, integer) TO anon;

-- ─── 11. Feed author_type / follow target alignment
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


COMMENT ON COLUMN public.user_roles.role IS
  'Account role: personal | business | organization | admin';
COMMENT ON COLUMN public.follows.target_type IS
  'Follow target: business | organization only (personal accounts are not followable)';
