-- 119_recommend_discover_people_eligible_fallback.sql
-- Fix empty "Descubrir personas": do not require setup_complete.
-- Bootstrap creates candidate_profiles with setup_complete=false while users
-- are still app-eligible (full_name present). Require active + public + name
-- + personal role, with progressive relevance and unconditional last-resort pool.

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
VOLATILE
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

  -- Soft rate limit for pagination/reloads (reads only).
  PERFORM public.assert_rate_limit(v_me, 'discover:people', 300, interval '1 hour');

  SELECT
    lower(trim(coalesce(cp.sector, ''))),
    lower(trim(coalesce(cp.headline, ''))),
    lower(trim(coalesce(cp.city, ''))),
    lower(trim(coalesce(cp.country, '')))
  INTO v_sector, v_headline, v_city, v_country
  FROM public.candidate_profiles cp
  WHERE cp.user_id = v_me;

  -- Employers: personalize from company profile when no candidate context.
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
    SELECT f.target_id
    FROM public.follows f
    WHERE f.user_id = v_me
      AND f.target_type IN ('personal', 'user', 'candidate', 'people')
  ),
  eligible AS (
    SELECT cp.*
    FROM public.candidate_profiles cp
    INNER JOIN public.user_roles ur ON ur.user_id = cp.user_id
    WHERE coalesce(cp.is_active, true) = true
      AND public.is_public_app_user(cp.user_id)
      AND cp.user_id NOT IN (SELECT excluded_id FROM excluded)
      AND coalesce(trim(cp.full_name), '') <> ''
      AND lower(coalesce(ur.role, '')) IN ('personal', 'candidate')
  ),
  -- Progressive pool (lower tier = stronger match). Final tier = any eligible profile.
  pool AS (
    SELECT ranked.user_id
    FROM (
      SELECT
        e.user_id,
        CASE
          WHEN v_sector <> ''
            AND v_city <> ''
            AND lower(trim(coalesce(e.sector, ''))) = v_sector
            AND lower(trim(coalesce(e.city, ''))) = v_city
            THEN 1
          WHEN v_sector <> ''
            AND v_country <> ''
            AND lower(trim(coalesce(e.sector, ''))) = v_sector
            AND lower(trim(coalesce(e.country, ''))) = v_country
            THEN 2
          WHEN v_headline <> ''
            AND coalesce(trim(e.headline), '') <> ''
            AND (
              lower(trim(e.headline)) = v_headline
              OR lower(trim(e.headline)) LIKE ('%' || v_headline || '%')
              OR v_headline LIKE ('%' || lower(trim(e.headline)) || '%')
            )
            THEN 3
          WHEN EXISTS (
            SELECT 1
            FROM public.skills s
            INNER JOIN viewer_skills vs ON vs.name = lower(trim(s.name))
            WHERE s.user_id = e.user_id
          ) THEN 4
          WHEN v_sector <> '' AND lower(trim(coalesce(e.sector, ''))) = v_sector THEN 5
          WHEN v_country <> '' AND lower(trim(coalesce(e.country, ''))) = v_country THEN 6
          WHEN v_city <> '' AND lower(trim(coalesce(e.city, ''))) = v_city THEN 7
          WHEN EXISTS (
            SELECT 1
            FROM public.education ed
            INNER JOIN viewer_institutions vi ON vi.institution = lower(trim(ed.institution))
            WHERE ed.user_id = e.user_id
          ) THEN 8
          WHEN EXISTS (
            SELECT 1
            FROM public.experience x
            INNER JOIN viewer_companies vc ON vc.company = lower(trim(x.company))
            WHERE x.user_id = e.user_id
          ) THEN 9
          WHEN e.updated_at >= (NOW() - INTERVAL '30 days') THEN 10
          ELSE 11
        END AS tier,
        e.updated_at
      FROM eligible e
    ) ranked
    ORDER BY ranked.tier ASC, ranked.updated_at DESC NULLS LAST
    LIMIT v_pool
  ),
  scored AS (
    SELECT
      e.user_id,
      e.full_name,
      e.headline,
      e.avatar_path,
      ur.username,
      (
        CASE
          WHEN v_sector <> ''
            AND v_city <> ''
            AND lower(trim(coalesce(e.sector, ''))) = v_sector
            AND lower(trim(coalesce(e.city, ''))) = v_city
            THEN 120
          ELSE 0
        END
        + CASE
            WHEN v_sector <> ''
              AND v_country <> ''
              AND lower(trim(coalesce(e.sector, ''))) = v_sector
              AND lower(trim(coalesce(e.country, ''))) = v_country
              THEN 90
            WHEN v_sector <> '' AND lower(trim(coalesce(e.sector, ''))) = v_sector THEN 70
            ELSE 0
          END
        + CASE
            WHEN v_headline <> ''
              AND coalesce(trim(e.headline), '') <> ''
              AND lower(trim(e.headline)) = v_headline THEN 80
            WHEN v_headline <> ''
              AND coalesce(trim(e.headline), '') <> ''
              AND (
                lower(trim(e.headline)) LIKE ('%' || v_headline || '%')
                OR v_headline LIKE ('%' || lower(trim(e.headline)) || '%')
              ) THEN 40
            ELSE 0
          END
        + (
            SELECT coalesce(count(*)::INT, 0) * 20
            FROM public.skills s
            INNER JOIN viewer_skills vs ON vs.name = lower(trim(s.name))
            WHERE s.user_id = e.user_id
          )
        + CASE
            WHEN EXISTS (
              SELECT 1
              FROM public.education ed
              INNER JOIN viewer_institutions vi ON vi.institution = lower(trim(ed.institution))
              WHERE ed.user_id = e.user_id
            ) THEN 40
            ELSE 0
          END
        + CASE
            WHEN v_city <> '' AND lower(trim(coalesce(e.city, ''))) = v_city THEN 30
            ELSE 0
          END
        + CASE
            WHEN EXISTS (
              SELECT 1
              FROM public.experience x
              INNER JOIN viewer_companies vc ON vc.company = lower(trim(x.company))
              WHERE x.user_id = e.user_id
            ) THEN 25
            ELSE 0
          END
        + CASE
            WHEN v_country <> '' AND lower(trim(coalesce(e.country, ''))) = v_country THEN 15
            ELSE 0
          END
        + CASE
            WHEN e.updated_at >= (NOW() - INTERVAL '14 days') THEN 10
            WHEN e.updated_at >= (NOW() - INTERVAL '30 days') THEN 5
            ELSE 0
          END
      )::INT AS relevance_score
    FROM eligible e
    LEFT JOIN public.user_roles ur ON ur.user_id = e.user_id
    WHERE e.user_id IN (SELECT p.user_id FROM pool p)
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
  'Discover people: progressive relevance with fallback to any eligible active personal profile (not gated on setup_complete).';

REVOKE ALL ON FUNCTION public.recommend_discover_people(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommend_discover_people(INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';
