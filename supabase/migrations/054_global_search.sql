-- =============================================
-- 054_global_search.sql
-- Global intelligent search: unaccent, enhanced FTS, global_search RPC,
-- trigram indexes, and search history scaffolding.
-- =============================================

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.unaccent('extensions.unaccent', $1)
$$;

CREATE OR REPLACE FUNCTION public.build_search_tsquery(p_query text)
RETURNS tsquery
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_words text[];
  v_word text;
  v_parts text[] := ARRAY[]::text[];
BEGIN
  v_words := regexp_split_to_array(
    lower(public.f_unaccent(trim(coalesce(p_query, '')))),
    '\s+'
  );

  FOREACH v_word IN ARRAY v_words
  LOOP
    IF v_word <> '' THEN
      v_parts := array_append(v_parts, v_word || ':*');
    END IF;
  END LOOP;

  IF coalesce(array_length(v_parts, 1), 0) = 0 THEN
    RETURN NULL;
  END IF;

  RETURN to_tsquery('spanish', array_to_string(v_parts, ' & '));
EXCEPTION
  WHEN OTHERS THEN
    RETURN websearch_to_tsquery('spanish', public.f_unaccent(trim(p_query)));
END;
$$;

CREATE OR REPLACE FUNCTION public.search_match_rank(
  p_title text,
  p_query text,
  p_fts tsvector,
  p_tsquery tsquery,
  p_type_boost real DEFAULT 0
)
RETURNS real
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT
    p_type_boost
    + CASE
        WHEN lower(public.f_unaccent(coalesce(p_title, ''))) = lower(public.f_unaccent(p_query)) THEN 100
        WHEN lower(public.f_unaccent(coalesce(p_title, ''))) LIKE lower(public.f_unaccent(p_query)) || '%' THEN 80
        WHEN lower(public.f_unaccent(coalesce(p_title, ''))) LIKE '%' || lower(public.f_unaccent(p_query)) || '%' THEN 55
        ELSE 0
      END
    + CASE
        WHEN p_tsquery IS NOT NULL AND p_fts @@ p_tsquery THEN ts_rank(p_fts, p_tsquery) * 25
        ELSE 0
      END;
$$;

-- ── Enhanced FTS triggers (accent-insensitive, richer fields) ───────────────

CREATE OR REPLACE FUNCTION public.update_candidate_profiles_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  skills_text text;
  experience_text text;
  education_text text;
  languages_text text;
  services_text text;
  preferences_text text;
BEGIN
  SELECT string_agg(s.name, ' ') INTO skills_text
  FROM public.skills s
  WHERE s.user_id = NEW.user_id;

  SELECT string_agg(concat_ws(' ', e.position, e.company, e.description), ' ') INTO experience_text
  FROM public.experience e
  WHERE e.user_id = NEW.user_id;

  SELECT string_agg(concat_ws(' ', ed.institution, ed.program, ed.grade), ' ') INTO education_text
  FROM public.education ed
  WHERE ed.user_id = NEW.user_id;

  SELECT string_agg(l.language, ' ') INTO languages_text
  FROM public.languages l
  WHERE l.user_id = NEW.user_id;

  SELECT string_agg(sv.name, ' ') INTO services_text
  FROM public.services sv
  WHERE sv.user_id = NEW.user_id;

  preferences_text := coalesce(NEW.job_preferences, '{}'::jsonb)::text;

  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.full_name), '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.headline), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.about), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.city), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.country), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(skills_text), '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(experience_text), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(education_text), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(languages_text), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(services_text), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(preferences_text), '')), 'C');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_company_profiles_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.company_name), '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.sector), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.company_type), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.city), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.country), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.address), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.description), '')), 'B');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_jobs_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  company_name_text text;
  skills_text text;
BEGIN
  SELECT co.company_name INTO company_name_text
  FROM public.company_profiles co
  WHERE co.user_id = NEW.company_id;

  skills_text := array_to_string(coalesce(NEW.required_skills, ARRAY[]::text[]), ' ');

  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.title), '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.description), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.requirements), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(company_name_text), '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.city), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.sector), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.country), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(NEW.job_type), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(public.f_unaccent(skills_text), '')), 'A');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_company_jobs_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.jobs j
  SET title = j.title
  WHERE j.company_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_company_jobs_fts_trigger ON public.company_profiles;
CREATE TRIGGER refresh_company_jobs_fts_trigger
  AFTER UPDATE OF company_name ON public.company_profiles
  FOR EACH ROW
  WHEN (OLD.company_name IS DISTINCT FROM NEW.company_name)
  EXECUTE FUNCTION public.refresh_company_jobs_fts();

UPDATE public.candidate_profiles SET user_id = user_id;
UPDATE public.company_profiles SET user_id = user_id;
UPDATE public.jobs SET id = id;

-- Trigram indexes for fast partial / accent-insensitive matching
CREATE INDEX IF NOT EXISTS candidate_profiles_full_name_trgm_idx
  ON public.candidate_profiles USING gin (public.f_unaccent(full_name) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS candidate_profiles_headline_trgm_idx
  ON public.candidate_profiles USING gin (public.f_unaccent(headline) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS company_profiles_name_trgm_idx
  ON public.company_profiles USING gin (public.f_unaccent(company_name) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS jobs_title_trgm_idx
  ON public.jobs USING gin (public.f_unaccent(title) extensions.gin_trgm_ops);

-- Search history scaffolding (future recent / frequent searches)
CREATE TABLE IF NOT EXISTS public.user_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  entity_type text,
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_search_frequent (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  entity_type text,
  search_count integer NOT NULL DEFAULT 1,
  last_searched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, query, entity_type)
);

CREATE INDEX IF NOT EXISTS user_search_history_user_created_idx
  ON public.user_search_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_search_frequent_user_count_idx
  ON public.user_search_frequent (user_id, search_count DESC, last_searched_at DESC);

ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_frequent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own search history" ON public.user_search_history;
CREATE POLICY "Users manage own search history"
ON public.user_search_history
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own frequent searches" ON public.user_search_frequent;
CREATE POLICY "Users manage own frequent searches"
ON public.user_search_frequent
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_search_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_search_frequent TO authenticated;

-- ── Global search RPC ─────────────────────────────────────────────────────────

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
AS $$
DECLARE
  v_query text := trim(coalesce(p_query, ''));
  v_norm text;
  v_tsquery tsquery;
  v_limit integer := greatest(coalesce(p_limit_per_type, 5), 1);
BEGIN
  IF v_query = '' THEN
    RETURN;
  END IF;

  v_norm := lower(public.f_unaccent(v_query));
  v_tsquery := public.build_search_tsquery(v_query);

  RETURN QUERY
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
      AND (
        (v_tsquery IS NOT NULL AND cp.fts @@ v_tsquery)
        OR public.f_unaccent(cp.full_name) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(cp.headline, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(cp.about, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(cp.city, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(cp.country, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(cp.job_preferences, '{}'::jsonb)::text) ILIKE '%' || v_norm || '%'
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
      )
    ORDER BY rank DESC, cp.created_at DESC
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
      AND coalesce(co.company_type, '') NOT IN ('Institucion publica', 'ONG')
      AND (
        (v_tsquery IS NOT NULL AND co.fts @@ v_tsquery)
        OR public.f_unaccent(co.company_name) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.sector, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.description, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.city, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.company_type, '')) ILIKE '%' || v_norm || '%'
      )
    ORDER BY rank DESC, co.created_at DESC
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
      AND coalesce(co.company_type, '') IN ('Institucion publica', 'ONG')
      AND (
        (v_tsquery IS NOT NULL AND co.fts @@ v_tsquery)
        OR public.f_unaccent(co.company_name) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.sector, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.description, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.city, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.company_type, '')) ILIKE '%' || v_norm || '%'
      )
    ORDER BY rank DESC, co.created_at DESC
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
        OR public.f_unaccent(coalesce(j.sector, '')) ILIKE '%' || v_norm || '%'
        OR public.f_unaccent(coalesce(co.company_name, '')) ILIKE '%' || v_norm || '%'
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(j.required_skills, ARRAY[]::text[])) AS skill(name)
          WHERE public.f_unaccent(skill.name) ILIKE '%' || v_norm || '%'
        )
      )
    ORDER BY rank DESC, j.created_at DESC
    LIMIT v_limit
  )
  SELECT * FROM candidates
  UNION ALL
  SELECT * FROM companies
  UNION ALL
  SELECT * FROM institutions
  UNION ALL
  SELECT * FROM jobs
  ORDER BY
    CASE result_type
      WHEN 'candidate' THEN 1
      WHEN 'company' THEN 2
      WHEN 'institution' THEN 3
      WHEN 'job' THEN 4
      ELSE 5
    END,
    rank DESC,
    created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.global_search(text, integer) TO authenticated;
