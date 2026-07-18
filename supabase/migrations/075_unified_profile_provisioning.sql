-- =============================================
-- 075_unified_profile_provisioning.sql
-- Single source of truth for profile creation:
--   auth.users → user_roles → candidate_profiles | company_profiles
-- Server-side, idempotent, metadata-driven.
-- =============================================

-- ─── 1. Normalize signup metadata into profile fields ───────────────────────

CREATE OR REPLACE FUNCTION public.extract_signup_identity(
  p_meta JSONB,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  full_name TEXT,
  company_name TEXT,
  sector TEXT,
  company_type TEXT,
  city TEXT,
  avatar_path TEXT
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_meta JSONB := coalesce(p_meta, '{}'::jsonb);
  v_full_name TEXT;
  v_email_local TEXT;
BEGIN
  full_name := trim(coalesce(
    v_meta->>'full_name',
    v_meta->>'name',
    ''
  ));

  company_name := trim(coalesce(v_meta->>'company_name', ''));
  sector := trim(coalesce(v_meta->>'sector', ''));
  company_type := trim(coalesce(v_meta->>'company_type', ''));
  city := trim(coalesce(v_meta->>'city', ''));
  avatar_path := trim(coalesce(
    v_meta->>'avatar_url',
    v_meta->>'picture',
    v_meta->>'avatar_path',
    ''
  ));

  IF full_name = '' AND p_email IS NOT NULL AND position('@' IN p_email) > 1 THEN
    v_email_local := split_part(p_email, '@', 1);
    v_email_local := replace(replace(replace(v_email_local, '.', ' '), '_', ' '), '-', ' ');
    full_name := initcap(trim(v_email_local));
  END IF;

  RETURN NEXT;
END;
$$;

-- ─── 2. Core provisioning RPC ───────────────────────────────────────────────

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
  'Idempotent profile bootstrap from auth metadata + optional client overrides.';

-- ─── 3. handle_new_user: role + profile when signup metadata is explicit ────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := lower(coalesce(NEW.raw_user_meta_data->>'role', ''));
  v_account_kind TEXT := lower(coalesce(NEW.raw_user_meta_data->>'account_kind', ''));
  v_explicit_role BOOLEAN := FALSE;
BEGIN
  IF v_role IN ('candidate') THEN v_role := 'personal'; END IF;
  IF v_role IN ('company') THEN v_role := 'business'; END IF;
  IF v_role IN ('institution') THEN v_role := 'organization'; END IF;

  IF v_account_kind IN ('personal', 'candidate') THEN v_role := 'personal'; v_explicit_role := TRUE; END IF;
  IF v_account_kind IN ('business', 'company') THEN v_role := 'business'; v_explicit_role := TRUE; END IF;
  IF v_account_kind IN ('organization', 'institution') THEN v_role := 'organization'; v_explicit_role := TRUE; END IF;

  IF v_role IN ('personal', 'business', 'organization') THEN
    v_explicit_role := v_explicit_role OR coalesce(NEW.raw_user_meta_data->>'role', '') <> '';
  END IF;

  IF v_role NOT IN ('personal', 'business', 'organization') THEN
    v_role := 'personal';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  -- Email signup carries role + identity in metadata → provision immediately.
  -- Google OAuth without metadata defers provisioning until set_initial_user_role / client RPC.
  IF v_explicit_role THEN
    BEGIN
      PERFORM public.provision_user_profile(NEW.id, NULL);
    EXCEPTION
      WHEN OTHERS THEN
        -- Never block auth signup; client RPC can retry with overrides.
        NULL;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- ─── 4. set_initial_user_role: always provision after role resolution ───────

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

  IF v_has_employer AND v_current.role IN ('business', 'organization')
     AND v_role IN ('business', 'organization')
     AND v_current.role <> v_role THEN
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
  ELSIF v_current.role = 'admin' THEN
    RETURN v_current;
  ELSIF v_current.role = v_role THEN
    v_result := v_current;
  ELSE
    IF v_has_personal OR v_has_employer THEN
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
  END IF;

  PERFORM public.provision_user_profile(v_user_id, NULL);

  RETURN v_result;
END;
$$;

-- ─── 5. Backfill users with role but no profile ─────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT ur.user_id, ur.role
    FROM public.user_roles ur
    WHERE ur.role IN ('personal', 'business', 'organization')
      AND NOT EXISTS (
        SELECT 1 FROM public.candidate_profiles cp WHERE cp.user_id = ur.user_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.company_profiles co WHERE co.user_id = ur.user_id
      )
  LOOP
    BEGIN
      PERFORM public.provision_user_profile(r.user_id, NULL);
    EXCEPTION
      WHEN OTHERS THEN
        -- Missing identity in metadata — client setup assistant handles these orphans.
        NULL;
    END;
  END LOOP;
END;
$$;
