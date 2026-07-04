-- =============================================
-- 056_fix_global_search_rpc.sql
-- Fix global_search RPC runtime error, ranking, FTS refresh, and coverage.
-- Root cause: RETURN QUERY ORDER BY referenced output columns ambiguous with PL/pgSQL vars.
-- Also fixes per-type LIMIT (ORDER BY/LIMIT in UNION branches without CTEs is ignored by PostgreSQL).
-- =============================================

-- Normalize user input: trim, collapse spaces, lowercase + unaccent for ILIKE.
CREATE OR REPLACE FUNCTION public.normalize_search_text(p_query text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(public.f_unaccent(trim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'))));
$$;

-- Rank helper must not be STRICT (v_tsquery can be NULL while ILIKE still matches).
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
AS $$
  SELECT
    coalesce(p_type_boost, 0)
    + CASE
        WHEN public.normalize_search_text(p_title) = public.normalize_search_text(p_query) THEN 100
        WHEN public.normalize_search_text(p_title) LIKE public.normalize_search_text(p_query) || '%' THEN 80
        WHEN public.normalize_search_text(p_title) LIKE '%' || public.normalize_search_text(p_query) || '%' THEN 55
        ELSE 0
      END
    + CASE
        WHEN p_tsquery IS NOT NULL AND p_fts IS NOT NULL AND p_fts @@ p_tsquery
          THEN ts_rank(p_fts, p_tsquery) * 25
        ELSE 0
      END;
$$;

CREATE OR REPLACE FUNCTION public.build_search_tsquery(p_query text)
RETURNS tsquery
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_words text[];
  v_word text;
  v_parts text[] := ARRAY[]::text[];
  v_normalized text;
BEGIN
  v_normalized := public.normalize_search_text(p_query);
  IF v_normalized = '' THEN
    RETURN NULL;
  END IF;

  v_words := regexp_split_to_array(v_normalized, '\s+');

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
    RETURN websearch_to_tsquery('spanish', v_normalized);
END;
$$;

-- Rebuild candidate FTS when related sections change.
CREATE OR REPLACE FUNCTION public.refresh_candidate_profile_fts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.candidate_profiles cp
  SET user_id = cp.user_id
  WHERE cp.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_candidate_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_candidate_profile_fts(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_candidate_fts_on_skills ON public.skills;
CREATE TRIGGER refresh_candidate_fts_on_skills
  AFTER INSERT OR UPDATE OR DELETE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_candidate_fts();

DROP TRIGGER IF EXISTS refresh_candidate_fts_on_experience ON public.experience;
CREATE TRIGGER refresh_candidate_fts_on_experience
  AFTER INSERT OR UPDATE OR DELETE ON public.experience
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_candidate_fts();

DROP TRIGGER IF EXISTS refresh_candidate_fts_on_education ON public.education;
CREATE TRIGGER refresh_candidate_fts_on_education
  AFTER INSERT OR UPDATE OR DELETE ON public.education
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_candidate_fts();

DROP TRIGGER IF EXISTS refresh_candidate_fts_on_services ON public.services;
CREATE TRIGGER refresh_candidate_fts_on_services
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_candidate_fts();

DROP TRIGGER IF EXISTS refresh_candidate_fts_on_languages ON public.languages;
CREATE TRIGGER refresh_candidate_fts_on_languages
  AFTER INSERT OR UPDATE OR DELETE ON public.languages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_candidate_fts();

DROP TRIGGER IF EXISTS refresh_candidate_fts_on_certifications ON public.certifications;
CREATE TRIGGER refresh_candidate_fts_on_certifications
  AFTER INSERT OR UPDATE OR DELETE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_candidate_fts();

-- Additional trigram indexes for partial / accent-insensitive matching.
CREATE INDEX IF NOT EXISTS skills_name_trgm_idx
  ON public.skills USING gin (public.f_unaccent(name) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS company_profiles_description_trgm_idx
  ON public.company_profiles USING gin (public.f_unaccent(description) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS company_profiles_sector_trgm_idx
  ON public.company_profiles USING gin (public.f_unaccent(sector) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS jobs_description_trgm_idx
  ON public.jobs USING gin (public.f_unaccent(description) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS experience_position_trgm_idx
  ON public.experience USING gin (public.f_unaccent(position) extensions.gin_trgm_ops);

-- Ensure FTS vectors include unaccent (054 trigger) and backfill.
UPDATE public.candidate_profiles SET user_id = user_id;
UPDATE public.company_profiles SET user_id = user_id;
UPDATE public.jobs SET id = id;

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

GRANT EXECUTE ON FUNCTION public.global_search(text, integer) TO authenticated;
