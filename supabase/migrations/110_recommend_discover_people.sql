-- 110_recommend_discover_people.sql
-- Personalized "Descubrir personas" recommendations with progressive pooling + scoring.
-- Does not alter existing Discover topic posts flow.

CREATE INDEX IF NOT EXISTS candidate_profiles_discover_sector_idx
  ON public.candidate_profiles (lower(trim(sector)), updated_at DESC)
  WHERE coalesce(is_active, true) = true
    AND coalesce(setup_complete, false) = true
    AND coalesce(trim(sector), '') <> '';

CREATE INDEX IF NOT EXISTS candidate_profiles_discover_city_idx
  ON public.candidate_profiles (lower(trim(city)), updated_at DESC)
  WHERE coalesce(is_active, true) = true
    AND coalesce(setup_complete, false) = true
    AND coalesce(trim(city), '') <> '';

CREATE INDEX IF NOT EXISTS candidate_profiles_discover_country_idx
  ON public.candidate_profiles (lower(trim(country)), updated_at DESC)
  WHERE coalesce(is_active, true) = true
    AND coalesce(setup_complete, false) = true
    AND coalesce(trim(country), '') <> '';

CREATE INDEX IF NOT EXISTS candidate_profiles_discover_updated_idx
  ON public.candidate_profiles (updated_at DESC)
  WHERE coalesce(is_active, true) = true
    AND coalesce(setup_complete, false) = true;

CREATE INDEX IF NOT EXISTS skills_discover_name_user_idx
  ON public.skills (lower(trim(name)), user_id)
  WHERE coalesce(trim(name), '') <> '';

CREATE INDEX IF NOT EXISTS education_discover_institution_user_idx
  ON public.education (lower(trim(institution)), user_id)
  WHERE coalesce(trim(institution), '') <> '';

CREATE INDEX IF NOT EXISTS experience_discover_company_user_idx
  ON public.experience (lower(trim(company)), user_id)
  WHERE coalesce(trim(company), '') <> '';

CREATE OR REPLACE FUNCTION public.recommend_discover_people(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  headline TEXT,
  avatar_path TEXT,
  username TEXT,
  relevance_score INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_limit INT := LEAST(GREATEST(coalesce(p_limit, 20), 1), 40);
  v_offset INT := GREATEST(coalesce(p_offset, 0), 0);
  v_pool INT := 500;
  v_sector TEXT := '';
  v_headline TEXT := '';
  v_city TEXT := '';
  v_country TEXT := '';
BEGIN
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.assert_rate_limit(v_me, 'discover:people', 60, interval '1 hour');

  SELECT
    lower(trim(coalesce(cp.sector, ''))),
    lower(trim(coalesce(cp.headline, ''))),
    lower(trim(coalesce(cp.city, ''))),
    lower(trim(coalesce(cp.country, '')))
  INTO v_sector, v_headline, v_city, v_country
  FROM public.candidate_profiles cp
  WHERE cp.user_id = v_me;

  -- Employers: personalize from company profile when no candidate profile context exists.
  IF coalesce(v_sector, '') = '' AND coalesce(v_city, '') = '' AND coalesce(v_country, '') = '' THEN
    SELECT
      lower(trim(coalesce(co.sector, ''))),
      lower(trim(coalesce(co.city, ''))),
      lower(trim(coalesce(co.country, '')))
    INTO v_sector, v_city, v_country
    FROM public.company_profiles co
    WHERE co.user_id = v_me;
  END IF;

  v_sector := coalesce(v_sector, '');
  v_headline := coalesce(v_headline, '');
  v_city := coalesce(v_city, '');
  v_country := coalesce(v_country, '');

  RETURN QUERY
  WITH
  viewer_skills AS (
    SELECT DISTINCT lower(trim(s.name)) AS name
    FROM public.skills s
    WHERE s.user_id = v_me
      AND coalesce(trim(s.name), '') <> ''
  ),
  viewer_institutions AS (
    SELECT DISTINCT lower(trim(e.institution)) AS institution
    FROM public.education e
    WHERE e.user_id = v_me
      AND coalesce(trim(e.institution), '') <> ''
  ),
  viewer_companies AS (
    SELECT DISTINCT lower(trim(x.company)) AS company
    FROM public.experience x
    WHERE x.user_id = v_me
      AND coalesce(trim(x.company), '') <> ''
  ),
  excluded AS (
    SELECT v_me AS excluded_id
    UNION
    -- Future-proof: if personal follows are ever enabled
    SELECT f.target_id
    FROM public.follows f
    WHERE f.user_id = v_me
      AND f.target_type IN ('personal', 'user', 'candidate', 'people')
  ),
  -- Progressive pool: prefer strong signals, then relax. Cap size for scoring cost.
  pool AS (
    SELECT ranked.user_id
    FROM (
      SELECT
        cp.user_id,
        CASE
          WHEN v_sector <> '' AND lower(trim(coalesce(cp.sector, ''))) = v_sector THEN 1
          WHEN EXISTS (
            SELECT 1
            FROM public.skills s
            INNER JOIN viewer_skills vs ON vs.name = lower(trim(s.name))
            WHERE s.user_id = cp.user_id
          ) THEN 2
          WHEN v_headline <> ''
            AND coalesce(trim(cp.headline), '') <> ''
            AND (
              lower(trim(cp.headline)) = v_headline
              OR lower(trim(cp.headline)) LIKE ('%' || v_headline || '%')
              OR v_headline LIKE ('%' || lower(trim(cp.headline)) || '%')
            ) THEN 3
          WHEN v_city <> '' AND lower(trim(coalesce(cp.city, ''))) = v_city THEN 4
          WHEN EXISTS (
            SELECT 1
            FROM public.education e
            INNER JOIN viewer_institutions vi ON vi.institution = lower(trim(e.institution))
            WHERE e.user_id = cp.user_id
          ) THEN 5
          WHEN EXISTS (
            SELECT 1
            FROM public.experience x
            INNER JOIN viewer_companies vc ON vc.company = lower(trim(x.company))
            WHERE x.user_id = cp.user_id
          ) THEN 6
          WHEN v_country <> '' AND lower(trim(coalesce(cp.country, ''))) = v_country THEN 7
          WHEN cp.updated_at >= (NOW() - INTERVAL '30 days') THEN 8
          ELSE 9
        END AS tier,
        cp.updated_at
      FROM public.candidate_profiles cp
      WHERE coalesce(cp.is_active, true) = true
        AND coalesce(cp.setup_complete, false) = true
        AND public.is_public_app_user(cp.user_id)
        AND cp.user_id NOT IN (SELECT excluded_id FROM excluded)
        AND coalesce(trim(cp.full_name), '') <> ''
        AND (
          (v_sector <> '' AND lower(trim(coalesce(cp.sector, ''))) = v_sector)
          OR EXISTS (
            SELECT 1
            FROM public.skills s
            INNER JOIN viewer_skills vs ON vs.name = lower(trim(s.name))
            WHERE s.user_id = cp.user_id
          )
          OR (
            v_headline <> ''
            AND coalesce(trim(cp.headline), '') <> ''
            AND (
              lower(trim(cp.headline)) = v_headline
              OR lower(trim(cp.headline)) LIKE ('%' || v_headline || '%')
              OR v_headline LIKE ('%' || lower(trim(cp.headline)) || '%')
            )
          )
          OR (v_city <> '' AND lower(trim(coalesce(cp.city, ''))) = v_city)
          OR EXISTS (
            SELECT 1
            FROM public.education e
            INNER JOIN viewer_institutions vi ON vi.institution = lower(trim(e.institution))
            WHERE e.user_id = cp.user_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.experience x
            INNER JOIN viewer_companies vc ON vc.company = lower(trim(x.company))
            WHERE x.user_id = cp.user_id
          )
          OR (v_country <> '' AND lower(trim(coalesce(cp.country, ''))) = v_country)
          OR cp.updated_at >= (NOW() - INTERVAL '30 days')
          -- Last resort: still prefer complete profiles over pure randomness
          OR (
            v_sector = ''
            AND v_headline = ''
            AND v_city = ''
            AND v_country = ''
            AND NOT EXISTS (SELECT 1 FROM viewer_skills)
            AND NOT EXISTS (SELECT 1 FROM viewer_institutions)
            AND NOT EXISTS (SELECT 1 FROM viewer_companies)
          )
        )
    ) ranked
    ORDER BY ranked.tier ASC, ranked.updated_at DESC NULLS LAST
    LIMIT v_pool
  ),
  scored AS (
    SELECT
      cp.user_id,
      cp.full_name,
      cp.headline,
      cp.avatar_path,
      ur.username,
      (
        CASE
          WHEN v_sector <> '' AND lower(trim(coalesce(cp.sector, ''))) = v_sector THEN 100
          ELSE 0
        END
        + CASE
            WHEN v_headline <> ''
              AND coalesce(trim(cp.headline), '') <> ''
              AND lower(trim(cp.headline)) = v_headline THEN 80
            WHEN v_headline <> ''
              AND coalesce(trim(cp.headline), '') <> ''
              AND (
                lower(trim(cp.headline)) LIKE ('%' || v_headline || '%')
                OR v_headline LIKE ('%' || lower(trim(cp.headline)) || '%')
              ) THEN 40
            ELSE 0
          END
        + (
            SELECT coalesce(count(*)::INT, 0) * 20
            FROM public.skills s
            INNER JOIN viewer_skills vs ON vs.name = lower(trim(s.name))
            WHERE s.user_id = cp.user_id
          )
        + CASE
            WHEN EXISTS (
              SELECT 1
              FROM public.education e
              INNER JOIN viewer_institutions vi ON vi.institution = lower(trim(e.institution))
              WHERE e.user_id = cp.user_id
            ) THEN 40
            ELSE 0
          END
        + CASE
            WHEN v_city <> '' AND lower(trim(coalesce(cp.city, ''))) = v_city THEN 30
            ELSE 0
          END
        + CASE
            WHEN EXISTS (
              SELECT 1
              FROM public.experience x
              INNER JOIN viewer_companies vc ON vc.company = lower(trim(x.company))
              WHERE x.user_id = cp.user_id
            ) THEN 25
            ELSE 0
          END
        + CASE
            WHEN v_country <> '' AND lower(trim(coalesce(cp.country, ''))) = v_country THEN 15
            ELSE 0
          END
        + CASE
            WHEN cp.updated_at >= (NOW() - INTERVAL '14 days') THEN 10
            ELSE 0
          END
      )::INT AS relevance_score
    FROM public.candidate_profiles cp
    LEFT JOIN public.user_roles ur ON ur.user_id = cp.user_id
    WHERE cp.user_id IN (SELECT p.user_id FROM pool p)
  )
  SELECT
    s.user_id,
    s.full_name,
    s.headline,
    s.avatar_path,
    s.username,
    s.relevance_score
  FROM scored s
  ORDER BY s.relevance_score DESC, s.full_name ASC NULLS LAST, s.user_id ASC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

COMMENT ON FUNCTION public.recommend_discover_people(INT, INT) IS
  'Personalized people recommendations for Descubrir personas. Scores sector/profession/skills/location/education/company/recency; paginated.';

REVOKE ALL ON FUNCTION public.recommend_discover_people(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommend_discover_people(INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';
