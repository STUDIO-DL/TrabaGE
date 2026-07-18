-- =============================================
-- 078_google_oauth_profile_identity.sql
-- Google OAuth signup: derive employer profile identity from Google metadata
-- when no registration form data exists (full_name → company_name fallback).
-- =============================================

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

  -- Google OAuth: employer accounts without a form use the person's Google name.
  IF v_role IN ('business', 'organization')
     AND coalesce(v_company_name, '') = ''
     AND coalesce(v_full_name, '') <> '' THEN
    v_company_name := v_full_name;
  END IF;

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

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'role', v_role,
    'created', v_created,
    'backfilled', v_backfilled
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_user_profile(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_user_profile(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION public.provision_user_profile(UUID, JSONB) IS
  'Idempotent profile bootstrap from auth metadata + optional client overrides. Google OAuth employer accounts derive company_name from full_name when missing.';
