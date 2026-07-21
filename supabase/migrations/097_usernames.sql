-- =============================================
-- 097_usernames.sql
-- Unique usernames on user_roles for all account types.
-- Public URLs: /@username (UUID routes remain compatible).
-- =============================================

-- ─── 1. Column + constraints ─────────────────────────────────────────────────

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS username TEXT;

COMMENT ON COLUMN public.user_roles.username IS
  'Unique public handle (3–30 chars, letters/numbers/._). Used in /@username URLs.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_username_format'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_username_format
      CHECK (
        username IS NULL OR (
          char_length(username) BETWEEN 3 AND 30
          AND username ~ '^[a-zA-Z0-9._]+$'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_username_lower_uidx
  ON public.user_roles (lower(username))
  WHERE username IS NOT NULL;

-- ─── 2. Helpers ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_reserved_username(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT lower(coalesce(p_username, '')) = ANY (ARRAY[
    'admin', 'personal', 'business', 'organization', 'organisation',
    'profile', 'profiles', 'company', 'companies', 'job', 'jobs',
    'post', 'posts', 'feed', 'search', 'login', 'register', 'signup',
    'settings', 'api', 'about', 'help', 'support', 'trabage', 'zarrel',
    'null', 'undefined', 'me', 'www', 'app', 'auth', 'discover',
    'messages', 'notifications', 'apply', 'dashboard'
  ]);
$$;

CREATE OR REPLACE FUNCTION public.normalize_username_base(p_source TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v TEXT;
BEGIN
  v := lower(trim(coalesce(p_source, '')));
  -- strip email domain if present
  IF position('@' IN v) > 0 THEN
    v := split_part(v, '@', 1);
  END IF;
  -- unaccent-ish: remove common diacritics via translate of latin1-ish chars
  v := translate(
    v,
    'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC'
  );
  v := regexp_replace(v, '[^a-z0-9._]+', '_', 'g');
  v := regexp_replace(v, '[._]{2,}', '_', 'g');
  v := trim(BOTH '._' FROM v);
  IF char_length(v) < 3 THEN
    v := rpad(coalesce(nullif(v, ''), 'user'), 3, '0');
  END IF;
  IF char_length(v) > 30 THEN
    v := left(v, 30);
    v := trim(BOTH '._' FROM v);
  END IF;
  IF char_length(v) < 3 OR public.is_reserved_username(v) THEN
    v := 'user';
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.username_is_available(p_username TEXT, p_exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p_username IS NOT NULL
    AND char_length(p_username) BETWEEN 3 AND 30
    AND p_username ~ '^[a-zA-Z0-9._]+$'
    AND NOT public.is_reserved_username(p_username)
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE lower(ur.username) = lower(p_username)
        AND (p_exclude_user_id IS NULL OR ur.user_id <> p_exclude_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.allocate_unique_username(
  p_base TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base TEXT := public.normalize_username_base(p_base);
  v_candidate TEXT;
  v_suffix TEXT;
  v_i INT;
BEGIN
  IF public.username_is_available(v_base, p_user_id) THEN
    RETURN v_base;
  END IF;

  -- david2, david3, ...
  FOR v_i IN 2..99 LOOP
    v_suffix := v_i::text;
    v_candidate := left(v_base, 30 - char_length(v_suffix)) || v_suffix;
    IF public.username_is_available(v_candidate, p_user_id) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;

  -- david_eg
  v_candidate := left(v_base, 27) || '_eg';
  IF public.username_is_available(v_candidate, p_user_id) THEN
    RETURN v_candidate;
  END IF;

  -- david + last 3 digits of user_id hash / uuid digits
  IF p_user_id IS NOT NULL THEN
    v_suffix := right(regexp_replace(p_user_id::text, '[^0-9]', '', 'g'), 3);
    IF char_length(v_suffix) < 3 THEN
      v_suffix := lpad(v_suffix, 3, '0');
    END IF;
    v_candidate := left(v_base, 30 - char_length(v_suffix)) || v_suffix;
    IF public.username_is_available(v_candidate, p_user_id) THEN
      RETURN v_candidate;
    END IF;
  END IF;

  -- last resort: base + random digits
  FOR v_i IN 1..20 LOOP
    v_suffix := (100 + floor(random() * 900))::int::text;
    v_candidate := left(v_base, 30 - char_length(v_suffix)) || v_suffix;
    IF public.username_is_available(v_candidate, p_user_id) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Could not allocate unique username';
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_username(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_username TEXT;
  v_source TEXT;
  v_email TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ur.role, ur.username
  INTO v_role, v_username
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id;

  IF v_role IS NULL OR v_role = 'admin' THEN
    RETURN v_username;
  END IF;

  IF v_username IS NOT NULL AND trim(v_username) <> '' THEN
    RETURN v_username;
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_user_id;

  IF v_role = 'personal' THEN
    SELECT cp.full_name INTO v_source
    FROM public.candidate_profiles cp
    WHERE cp.user_id = p_user_id;
  ELSE
    SELECT co.company_name INTO v_source
    FROM public.company_profiles co
    WHERE co.user_id = p_user_id;
  END IF;

  v_source := coalesce(nullif(trim(v_source), ''), nullif(trim(v_email), ''), 'user');
  v_username := public.allocate_unique_username(v_source, p_user_id);

  UPDATE public.user_roles
  SET username = v_username
  WHERE user_id = p_user_id
    AND username IS NULL;

  RETURN v_username;
END;
$$;

REVOKE ALL ON FUNCTION public.is_reserved_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_reserved_username(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.normalize_username_base(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_username_base(TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.username_is_available(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_is_available(TEXT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.allocate_unique_username(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_unique_username(TEXT, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.ensure_user_username(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_username(UUID) TO authenticated, service_role;

-- ─── 3. Client RPCs ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_my_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_clean TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_clean := trim(coalesce(p_username, ''));
  IF left(v_clean, 1) = '@' THEN
    v_clean := substr(v_clean, 2);
  END IF;

  IF char_length(v_clean) < 3 OR char_length(v_clean) > 30 THEN
    RAISE EXCEPTION 'USERNAME_INVALID_LENGTH';
  END IF;

  IF v_clean !~ '^[a-zA-Z0-9._]+$' THEN
    RAISE EXCEPTION 'USERNAME_INVALID_FORMAT';
  END IF;

  IF public.is_reserved_username(v_clean) THEN
    RAISE EXCEPTION 'USERNAME_RESERVED';
  END IF;

  IF NOT public.username_is_available(v_clean, v_uid) THEN
    RAISE EXCEPTION 'USERNAME_TAKEN';
  END IF;

  UPDATE public.user_roles
  SET username = v_clean
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  RETURN v_clean;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_username(p_username TEXT)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  username TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean TEXT := trim(coalesce(p_username, ''));
BEGIN
  IF left(v_clean, 1) = '@' THEN
    v_clean := substr(v_clean, 2);
  END IF;

  IF v_clean = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ur.user_id, ur.role::text, ur.username
  FROM public.user_roles ur
  WHERE lower(ur.username) = lower(v_clean)
    AND lower(coalesce(ur.role, '')) <> 'admin'
    AND public.is_public_app_user(ur.user_id)
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_username_for_user(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ur.username
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.set_my_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_username(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_username(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_username_for_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_username_for_user(UUID) TO anon, authenticated, service_role;

-- ─── 4. Hook provision_user_profile to ensure username ───────────────────────

CREATE OR REPLACE FUNCTION public.provision_user_profile(
  p_user_id UUID DEFAULT auth.uid(),
  p_overrides JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := coalesce(p_user_id, auth.uid());
  v_role TEXT;
  v_meta JSONB;
  v_email TEXT;
  v_identity RECORD;
  v_overrides JSONB := coalesce(p_overrides, '{}'::jsonb);
  v_full_name TEXT;
  v_company_name TEXT;
  v_sector TEXT;
  v_company_type TEXT;
  v_city TEXT;
  v_avatar_path TEXT;
  v_has_candidate BOOLEAN;
  v_has_company BOOLEAN;
  v_created BOOLEAN := FALSE;
  v_backfilled BOOLEAN := FALSE;
  v_username TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'Cannot provision profile for another user';
  END IF;

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_user_id;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'no_role');
  END IF;

  IF v_role = 'admin' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'admin');
  END IF;

  SELECT u.raw_user_meta_data, u.email
  INTO v_meta, v_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT * INTO v_identity
  FROM public.extract_signup_identity(v_meta, v_email);

  v_full_name := coalesce(nullif(trim(v_overrides->>'full_name'), ''), v_identity.full_name);
  v_company_name := coalesce(nullif(trim(v_overrides->>'company_name'), ''), v_identity.company_name);
  v_sector := coalesce(nullif(trim(v_overrides->>'sector'), ''), v_identity.sector);
  v_company_type := coalesce(nullif(trim(v_overrides->>'company_type'), ''), v_identity.company_type);
  v_city := coalesce(nullif(trim(v_overrides->>'city'), ''), v_identity.city);
  v_avatar_path := coalesce(nullif(trim(v_overrides->>'avatar_path'), ''), v_identity.avatar_path);

  SELECT EXISTS (
    SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = v_user_id
  ) INTO v_has_candidate;

  SELECT EXISTS (
    SELECT 1 FROM public.company_profiles cp WHERE cp.user_id = v_user_id
  ) INTO v_has_company;

  IF v_has_candidate AND v_has_company THEN
    RAISE EXCEPTION 'Account has multiple profile types';
  END IF;

  IF v_role = 'personal' THEN
    IF v_has_company THEN
      RAISE EXCEPTION 'Role/profile mismatch: personal role with company profile';
    END IF;

    IF v_has_candidate THEN
      UPDATE public.candidate_profiles cp
      SET
        full_name = CASE WHEN trim(coalesce(cp.full_name, '')) = '' AND v_full_name <> '' THEN v_full_name ELSE cp.full_name END,
        city = coalesce(cp.city, nullif(v_city, '')),
        country = coalesce(cp.country, 'Guinea Ecuatorial'),
        avatar_path = coalesce(cp.avatar_path, nullif(v_avatar_path, '')),
        updated_at = NOW()
      WHERE cp.user_id = v_user_id
        AND (
          (trim(coalesce(cp.full_name, '')) = '' AND v_full_name <> '')
          OR (cp.city IS NULL AND v_city <> '')
          OR (cp.country IS NULL)
          OR (cp.avatar_path IS NULL AND v_avatar_path <> '')
        );

      IF FOUND THEN
        v_backfilled := TRUE;
      END IF;
    ELSE
      IF coalesce(v_full_name, '') = '' THEN
        RAISE EXCEPTION 'Cannot create personal profile without full_name';
      END IF;

      INSERT INTO public.candidate_profiles (
        user_id,
        full_name,
        city,
        country,
        avatar_path
      ) VALUES (
        v_user_id,
        v_full_name,
        nullif(v_city, ''),
        'Guinea Ecuatorial',
        nullif(v_avatar_path, '')
      );

      v_created := TRUE;
    END IF;

  ELSIF v_role IN ('business', 'organization') THEN
    IF v_has_candidate THEN
      RAISE EXCEPTION 'Role/profile mismatch: employer role with personal profile';
    END IF;

    IF v_role = 'organization' AND coalesce(v_company_type, '') = '' THEN
      v_company_type := 'Institucion publica';
    END IF;

    IF v_has_company THEN
      UPDATE public.company_profiles cp
      SET
        company_name = CASE WHEN trim(coalesce(cp.company_name, '')) = '' AND v_company_name <> '' THEN v_company_name ELSE cp.company_name END,
        sector = coalesce(cp.sector, nullif(v_sector, '')),
        company_type = coalesce(cp.company_type, nullif(v_company_type, '')),
        city = coalesce(cp.city, nullif(v_city, '')),
        country = coalesce(cp.country, 'Guinea Ecuatorial'),
        updated_at = NOW()
      WHERE cp.user_id = v_user_id
        AND (
          (trim(coalesce(cp.company_name, '')) = '' AND v_company_name <> '')
          OR (cp.sector IS NULL AND v_sector <> '')
          OR (cp.company_type IS NULL AND v_company_type <> '')
          OR (cp.city IS NULL AND v_city <> '')
          OR (cp.country IS NULL)
        );

      IF FOUND THEN
        v_backfilled := TRUE;
      END IF;
    ELSE
      IF coalesce(v_company_name, '') = '' THEN
        RAISE EXCEPTION 'Cannot create employer profile without company_name';
      END IF;

      INSERT INTO public.company_profiles (
        user_id,
        company_name,
        sector,
        company_type,
        city,
        country
      ) VALUES (
        v_user_id,
        v_company_name,
        nullif(v_sector, ''),
        nullif(v_company_type, ''),
        nullif(v_city, ''),
        'Guinea Ecuatorial'
      );

      v_created := TRUE;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported role: %', v_role;
  END IF;

  v_username := public.ensure_user_username(v_user_id);

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'role', v_role,
    'created', v_created,
    'backfilled', v_backfilled,
    'username', v_username
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_user_profile(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_user_profile(UUID, JSONB) TO authenticated, service_role;

-- ─── 5. Backfill existing accounts ───────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.username IS NULL
      AND lower(coalesce(ur.role, '')) <> 'admin'
    ORDER BY ur.created_at NULLS LAST
  LOOP
    PERFORM public.ensure_user_username(r.user_id);
  END LOOP;
END $$;

-- ─── 6. Public views include username ────────────────────────────────────────

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
  cp.social_links,
  cp.setup_complete,
  cp.is_active,
  cp.created_at,
  cp.updated_at,
  ur.username
FROM public.candidate_profiles cp
LEFT JOIN public.user_roles ur ON ur.user_id = cp.user_id
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
  co.social_links,
  co.is_verified,
  co.verification_status,
  co.verified_status,
  co.setup_complete,
  co.is_active,
  co.created_at,
  co.updated_at,
  ur.username
FROM public.company_profiles co
LEFT JOIN public.user_roles ur ON ur.user_id = co.user_id
WHERE coalesce(co.is_active, true) = true
  AND public.is_public_app_user(co.user_id);

REVOKE ALL ON public.candidate_profiles_public FROM PUBLIC;
REVOKE ALL ON public.company_profiles_public FROM PUBLIC;
GRANT SELECT ON public.candidate_profiles_public TO anon, authenticated, service_role;
GRANT SELECT ON public.company_profiles_public TO anon, authenticated, service_role;

-- ─── 7. Search RPCs: match username + prefer /@ paths ────────────────────────

-- Return type changed (added username) — must drop before recreate.
DROP FUNCTION IF EXISTS public.search_candidates(TEXT, INT);

CREATE OR REPLACE FUNCTION public.search_candidates(keyword TEXT, p_limit INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  headline TEXT,
  city TEXT,
  avatar_path TEXT,
  username TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  fts_query TSQUERY;
  v_limit INT := LEAST(GREATEST(coalesce(p_limit, 20), 1), 50);
  v_keyword TEXT := trim(coalesce(keyword, ''));
BEGIN
  IF left(v_keyword, 1) = '@' THEN
    v_keyword := substr(v_keyword, 2);
  END IF;

  IF v_keyword IS NULL OR char_length(v_keyword) < 2 THEN
    RETURN;
  END IF;

  BEGIN
    fts_query := websearch_to_tsquery('spanish', v_keyword);
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
    cp.avatar_path,
    ur.username
  FROM public.candidate_profiles AS cp
  LEFT JOIN public.user_roles ur ON ur.user_id = cp.user_id
  WHERE coalesce(cp.is_active, true) = true
    AND public.is_public_app_user(cp.user_id)
    AND (
      (fts_query IS NOT NULL AND cp.fts @@ fts_query)
      OR cp.full_name ILIKE ('%' || v_keyword || '%')
      OR cp.headline ILIKE ('%' || v_keyword || '%')
      OR cp.city ILIKE ('%' || v_keyword || '%')
      OR ur.username ILIKE ('%' || v_keyword || '%')
    )
  ORDER BY
    CASE WHEN lower(ur.username) = lower(v_keyword) THEN 0 ELSE 1 END,
    CASE WHEN fts_query IS NOT NULL THEN ts_rank(cp.fts, fts_query) ELSE 0 END DESC,
    cp.updated_at DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

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
  IF left(v_query, 1) = '@' THEN
    v_query := substr(v_query, 2);
  END IF;
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
        concat_ws(' • ',
          CASE WHEN ur.username IS NOT NULL THEN '@' || ur.username END,
          cp.headline,
          cp.city
        ) AS subtitle,
        CASE
          WHEN ur.username IS NOT NULL AND trim(ur.username) <> '' THEN '/@' || ur.username
          ELSE '/profile/' || cp.user_id::text
        END AS path,
        cp.avatar_path,
        greatest(
          public.search_match_rank(cp.full_name, v_query, cp.fts, v_tsquery, 0.15::real),
          CASE WHEN ur.username IS NOT NULL AND lower(ur.username) = lower(v_query) THEN 1.0::real
               WHEN ur.username IS NOT NULL AND public.f_unaccent(ur.username) ILIKE '%' || v_norm || '%' THEN 0.85::real
               ELSE 0::real END
        ) AS rank,
        cp.created_at
      FROM public.candidate_profiles cp
      LEFT JOIN public.user_roles ur ON ur.user_id = cp.user_id
      WHERE coalesce(cp.is_active, true) = true
        AND public.is_public_app_user(cp.user_id)
        AND (
          (v_tsquery IS NOT NULL AND cp.fts @@ v_tsquery)
          OR public.f_unaccent(cp.full_name) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.headline, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.about, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.city, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(cp.country, '')) ILIKE '%' || v_norm || '%'
          OR public.f_unaccent(coalesce(ur.username, '')) ILIKE '%' || v_norm || '%'
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
        concat_ws(' • ',
          CASE WHEN ur.username IS NOT NULL THEN '@' || ur.username END,
          co.sector,
          co.city
        ) AS subtitle,
        CASE
          WHEN ur.username IS NOT NULL AND trim(ur.username) <> '' THEN '/@' || ur.username
          ELSE '/companies/' || co.user_id::text
        END AS path,
        co.logo_path AS avatar_path,
        greatest(
          public.search_match_rank(co.company_name, v_query, co.fts, v_tsquery, 0.25::real),
          CASE WHEN ur.username IS NOT NULL AND lower(ur.username) = lower(v_query) THEN 1.0::real
               WHEN ur.username IS NOT NULL AND public.f_unaccent(ur.username) ILIKE '%' || v_norm || '%' THEN 0.85::real
               ELSE 0::real END
        ) AS rank,
        co.created_at
      FROM public.company_profiles co
      LEFT JOIN public.user_roles ur ON ur.user_id = co.user_id
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
          OR public.f_unaccent(coalesce(ur.username, '')) ILIKE '%' || v_norm || '%'
        )
      ORDER BY rank DESC NULLS LAST, co.created_at DESC
      LIMIT v_limit
    ),
    institutions AS (
      SELECT
        'institution'::text AS result_type,
        co.user_id AS result_id,
        co.company_name AS title,
        concat_ws(' • ',
          CASE WHEN ur.username IS NOT NULL THEN '@' || ur.username END,
          coalesce(co.company_type, 'Institución'),
          co.city
        ) AS subtitle,
        CASE
          WHEN ur.username IS NOT NULL AND trim(ur.username) <> '' THEN '/@' || ur.username
          ELSE '/companies/' || co.user_id::text
        END AS path,
        co.logo_path AS avatar_path,
        greatest(
          public.search_match_rank(co.company_name, v_query, co.fts, v_tsquery, 0.20::real),
          CASE WHEN ur.username IS NOT NULL AND lower(ur.username) = lower(v_query) THEN 1.0::real
               WHEN ur.username IS NOT NULL AND public.f_unaccent(ur.username) ILIKE '%' || v_norm || '%' THEN 0.85::real
               ELSE 0::real END
        ) AS rank,
        co.created_at
      FROM public.company_profiles co
      LEFT JOIN public.user_roles ur ON ur.user_id = co.user_id
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
          OR public.f_unaccent(coalesce(ur.username, '')) ILIKE '%' || v_norm || '%'
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
