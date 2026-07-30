-- 120_profile_completion_reminder.sql
-- Intelligent profile-completion reminder (min 10 minutes after registration).
-- Pattern: enqueue at registration → cron/worker evaluates REAL profile → Resend once.

-- ─── 1. Outbox / audit ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profile_completion_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_kind TEXT NOT NULL DEFAULT 'initial'
    CHECK (reminder_kind IN ('initial')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  account_type TEXT
    CHECK (account_type IS NULL OR account_type IN ('personal', 'business', 'organization')),
  email TEXT,
  profile_completion INT
    CHECK (profile_completion IS NULL OR (profile_completion >= 0 AND profile_completion <= 100)),
  missing_sections TEXT[] NOT NULL DEFAULT '{}',
  completed_sections TEXT[] NOT NULL DEFAULT '{}',
  eligible_at TIMESTAMPTZ NOT NULL,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reminder_kind)
);

CREATE INDEX IF NOT EXISTS idx_profile_completion_reminders_due
  ON public.profile_completion_reminders (status, eligible_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_profile_completion_reminders_user
  ON public.profile_completion_reminders (user_id);

CREATE TABLE IF NOT EXISTS public.profile_completion_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES public.profile_completion_reminders(id) ON DELETE SET NULL,
  status TEXT NOT NULL
    CHECK (status IN ('sent', 'failed', 'skipped', 'cancelled')),
  email TEXT,
  account_type TEXT,
  profile_completion INT,
  missing_sections TEXT[],
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_completion_reminder_logs_user
  ON public.profile_completion_reminder_logs (user_id, created_at DESC);

ALTER TABLE public.profile_completion_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_completion_reminder_logs ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon — service_role only (backend).

REVOKE ALL ON TABLE public.profile_completion_reminders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.profile_completion_reminder_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_completion_reminders TO service_role;
GRANT ALL ON TABLE public.profile_completion_reminder_logs TO service_role;

-- ─── 2. Shared completion calculator (single source of truth in SQL) ───────

CREATE OR REPLACE FUNCTION public.get_profile_completion(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_company_type TEXT;
  v_account_type TEXT;
  v_sections JSONB := '[]'::JSONB;
  v_done INT := 0;
  v_total INT := 0;
  v_percent INT := 0;
  v_missing TEXT[] := '{}';
  v_completed TEXT[] := '{}';
  v_sufficient BOOLEAN := FALSE;
  r RECORD;
  v_has_social BOOLEAN := FALSE;
  v_svc_count INT := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'account_type', NULL,
      'percent', 0,
      'sufficient', false,
      'missing_sections', '[]'::JSONB,
      'completed_sections', '[]'::JSONB,
      'sections', '[]'::JSONB
    );
  END IF;

  -- Authenticated callers may only inspect their own completion.
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT lower(coalesce(ur.role, '')) INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id;

  IF v_role IN ('candidate') THEN v_role := 'personal'; END IF;
  IF v_role IN ('company') THEN v_role := 'business'; END IF;
  IF v_role IN ('institution') THEN v_role := 'organization'; END IF;

  IF v_role = 'business' THEN
    SELECT co.company_type INTO v_company_type
    FROM public.company_profiles co
    WHERE co.user_id = p_user_id;
    IF coalesce(v_company_type, '') IN ('Institucion publica', 'ONG') THEN
      v_role := 'organization';
    END IF;
  END IF;

  IF v_role = 'organization' THEN
    v_account_type := 'organization';
  ELSIF v_role = 'business' THEN
    v_account_type := 'business';
  ELSIF v_role = 'personal' THEN
    v_account_type := 'personal';
  ELSE
    -- Fallback: infer from profiles
    IF EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = p_user_id) THEN
      SELECT company_type INTO v_company_type
      FROM public.company_profiles WHERE user_id = p_user_id;
      IF coalesce(v_company_type, '') IN ('Institucion publica', 'ONG') THEN
        v_account_type := 'organization';
      ELSE
        v_account_type := 'business';
      END IF;
    ELSIF EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = p_user_id) THEN
      v_account_type := 'personal';
    ELSE
      RETURN jsonb_build_object(
        'account_type', NULL,
        'percent', 0,
        'sufficient', false,
        'missing_sections', '[]'::JSONB,
        'completed_sections', '[]'::JSONB,
        'sections', '[]'::JSONB
      );
    END IF;
  END IF;

  IF v_account_type = 'personal' THEN
    SELECT
      jsonb_build_array(
        jsonb_build_object('key', 'full_name', 'label', 'Nombre', 'done', coalesce(trim(cp.full_name), '') <> ''),
        jsonb_build_object('key', 'avatar', 'label', 'Foto de perfil', 'done', coalesce(trim(cp.avatar_path), '') <> ''),
        jsonb_build_object('key', 'headline', 'label', 'Titular profesional', 'done', length(coalesce(trim(cp.headline), '')) >= 6),
        jsonb_build_object('key', 'about', 'label', 'Acerca de mí', 'done', length(coalesce(trim(cp.about), '')) >= 30),
        jsonb_build_object('key', 'sector', 'label', 'Sector', 'done', coalesce(trim(cp.sector), '') <> ''),
        jsonb_build_object('key', 'city', 'label', 'Ciudad', 'done', coalesce(trim(cp.city), '') <> ''),
        jsonb_build_object(
          'key', 'experience', 'label', 'Experiencia',
          'done', EXISTS (
            SELECT 1 FROM public.experience x
            WHERE x.user_id = p_user_id
              AND coalesce(trim(x.position), '') <> ''
              AND coalesce(trim(x.company), '') <> ''
              AND x.start_date IS NOT NULL
          )
        ),
        jsonb_build_object(
          'key', 'education', 'label', 'Educación',
          'done', EXISTS (
            SELECT 1 FROM public.education e
            WHERE e.user_id = p_user_id
              AND coalesce(trim(e.institution), '') <> ''
              AND coalesce(trim(coalesce(e.program, e.specialty)), '') <> ''
          )
        ),
        jsonb_build_object(
          'key', 'skills', 'label', 'Habilidades',
          'done', (SELECT count(*) FROM public.skills s WHERE s.user_id = p_user_id) >= 1
        ),
        jsonb_build_object(
          'key', 'languages', 'label', 'Idiomas',
          'done', EXISTS (SELECT 1 FROM public.languages l WHERE l.user_id = p_user_id)
        ),
        jsonb_build_object(
          'key', 'services', 'label', 'Servicios',
          'done', EXISTS (SELECT 1 FROM public.services sv WHERE sv.user_id = p_user_id)
        ),
        jsonb_build_object(
          'key', 'certifications', 'label', 'Certificaciones',
          'done', EXISTS (SELECT 1 FROM public.certifications c WHERE c.user_id = p_user_id)
        ),
        jsonb_build_object(
          'key', 'projects', 'label', 'Proyectos',
          'done', EXISTS (SELECT 1 FROM public.projects p WHERE p.user_id = p_user_id)
        ),
        jsonb_build_object(
          'key', 'links', 'label', 'Enlaces / redes',
          'done',
            EXISTS (SELECT 1 FROM public.candidate_links cl WHERE cl.user_id = p_user_id)
            OR (
              cp.social_links IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM jsonb_each_text(cp.social_links) j
                WHERE coalesce(trim(j.value), '') <> ''
              )
            )
        )
      )
    INTO v_sections
    FROM public.candidate_profiles cp
    WHERE cp.user_id = p_user_id;

    IF v_sections IS NULL THEN
      v_sections := '[]'::JSONB;
    END IF;

  ELSE
    -- business / organization
    SELECT
      EXISTS (
        SELECT 1
        FROM jsonb_each_text(coalesce(co.social_links, '{}'::JSONB)) j
        WHERE coalesce(trim(j.value), '') <> ''
      ),
      (SELECT count(*) FROM public.company_services cs WHERE cs.company_id = p_user_id)
    INTO v_has_social, v_svc_count
    FROM public.company_profiles co
    WHERE co.user_id = p_user_id;

    SELECT
      jsonb_build_array(
        jsonb_build_object('key', 'company_name', 'label', 'Nombre', 'done', coalesce(trim(co.company_name), '') <> ''),
        jsonb_build_object('key', 'logo', 'label', 'Logo', 'done', coalesce(trim(co.logo_path), '') <> ''),
        jsonb_build_object('key', 'description', 'label', 'Descripción', 'done', length(coalesce(trim(co.description), '')) >= 40),
        jsonb_build_object(
          'key', CASE WHEN v_account_type = 'organization' THEN 'company_type' ELSE 'sector' END,
          'label', CASE WHEN v_account_type = 'organization' THEN 'Tipo de organización' ELSE 'Sector' END,
          'done', CASE
            WHEN v_account_type = 'organization' THEN coalesce(trim(co.company_type), '') <> ''
            ELSE coalesce(trim(co.sector), '') <> ''
          END
        ),
        jsonb_build_object('key', 'city', 'label', 'Ubicación', 'done', coalesce(trim(co.city), '') <> ''),
        jsonb_build_object('key', 'website', 'label', 'Sitio web', 'done', coalesce(trim(co.website), '') <> ''),
        jsonb_build_object('key', 'social', 'label', 'Redes sociales', 'done', coalesce(v_has_social, false)),
        jsonb_build_object('key', 'services', 'label', 'Servicios', 'done', coalesce(v_svc_count, 0) > 0),
        jsonb_build_object(
          'key', 'projects', 'label', 'Proyectos',
          'done', EXISTS (SELECT 1 FROM public.projects p WHERE p.user_id = p_user_id)
        ),
        jsonb_build_object('key', 'cover', 'label', 'Imagen de portada', 'done', coalesce(trim(co.cover_path), '') <> '')
      )
    INTO v_sections
    FROM public.company_profiles co
    WHERE co.user_id = p_user_id;

    IF v_sections IS NULL THEN
      v_sections := '[]'::JSONB;
    END IF;
  END IF;

  v_total := jsonb_array_length(v_sections);
  FOR r IN SELECT * FROM jsonb_array_elements(v_sections)
  LOOP
    IF coalesce((r.value ->> 'done')::BOOLEAN, false) THEN
      v_done := v_done + 1;
      v_completed := array_append(v_completed, r.value ->> 'label');
    ELSE
      v_missing := array_append(v_missing, r.value ->> 'label');
    END IF;
  END LOOP;

  IF v_total > 0 THEN
    v_percent := round((v_done::NUMERIC / v_total::NUMERIC) * 100)::INT;
  END IF;

  -- Sufficient = at least ~55% AND key identity present
  IF v_account_type = 'personal' THEN
    v_sufficient := v_percent >= 55
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_sections) s
        WHERE s.value ->> 'key' = 'full_name' AND (s.value ->> 'done')::BOOLEAN
      )
      AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value ->> 'key' = 'headline' AND (s.value ->> 'done')::BOOLEAN)
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value ->> 'key' = 'about' AND (s.value ->> 'done')::BOOLEAN)
      )
      AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value ->> 'key' = 'experience' AND (s.value ->> 'done')::BOOLEAN)
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value ->> 'key' = 'education' AND (s.value ->> 'done')::BOOLEAN)
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value ->> 'key' = 'skills' AND (s.value ->> 'done')::BOOLEAN)
      );
  ELSE
    v_sufficient := v_percent >= 55
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_sections) s
        WHERE s.value ->> 'key' = 'company_name' AND (s.value ->> 'done')::BOOLEAN
      )
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_sections) s
        WHERE s.value ->> 'key' = 'description' AND (s.value ->> 'done')::BOOLEAN
      )
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_sections) s
        WHERE s.value ->> 'key' = 'city' AND (s.value ->> 'done')::BOOLEAN
      );
  END IF;

  RETURN jsonb_build_object(
    'account_type', v_account_type,
    'percent', v_percent,
    'sufficient', v_sufficient,
    'missing_sections', to_jsonb(v_missing),
    'completed_sections', to_jsonb(v_completed),
    'sections', v_sections
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_completion()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.get_profile_completion(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.get_profile_completion(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_profile_completion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_completion(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_completion() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_profile_completion(UUID) IS
  'Canonical profile completion score (0–100) + missing/completed section labels for personal/business/organization.';
COMMENT ON FUNCTION public.get_profile_completion() IS
  'Profile completion for the authenticated user (auth.uid()).';

-- ─── 3. Enqueue after registration (not at welcome send time) ─────────────

CREATE OR REPLACE FUNCTION public.enqueue_profile_completion_reminder_if_needed()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_user auth.users%ROWTYPE;
  v_email TEXT;
  v_eligible_at TIMESTAMPTZ;
  v_account_type TEXT;
  v_inserted UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'user_not_found');
  END IF;

  -- Same registration gate as welcome email (no Google LOGIN orphans).
  IF NOT public.is_trabage_registration_complete(v_user) THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'registration_incomplete');
  END IF;

  v_email := nullif(trim(coalesce(v_user.email, '')), '');
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'no_email');
  END IF;

  -- Prefer account creation time + 10 minutes (minimum delay after registration).
  v_eligible_at := coalesce(v_user.created_at, NOW()) + INTERVAL '10 minutes';

  v_account_type := public.resolve_welcome_account_type(v_uid);

  INSERT INTO public.profile_completion_reminders (
    user_id,
    reminder_kind,
    status,
    account_type,
    email,
    eligible_at
  ) VALUES (
    v_uid,
    'initial',
    'pending',
    v_account_type,
    v_email,
    v_eligible_at
  )
  ON CONFLICT (user_id, reminder_kind) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'already_queued');
  END IF;

  RETURN jsonb_build_object(
    'queued', true,
    'id', v_inserted,
    'eligible_at', v_eligible_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_profile_completion_reminder_if_needed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_profile_completion_reminder_if_needed() TO authenticated;

COMMENT ON FUNCTION public.enqueue_profile_completion_reminder_if_needed() IS
  'Queues a one-time profile completion reminder eligible 10+ minutes after auth.users.created_at. Idempotent.';

-- ─── 4. Claim batch for worker (service_role) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_profile_completion_reminders(p_limit INT DEFAULT 20)
RETURNS SETOF public.profile_completion_reminders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INT := LEAST(GREATEST(coalesce(p_limit, 20), 1), 50);
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT r.id
    FROM public.profile_completion_reminders r
    WHERE (
        (r.status = 'pending' AND r.eligible_at <= NOW())
        OR (
          r.status = 'failed'
          AND r.retry_count < r.max_retries
          AND coalesce(r.last_attempt_at, r.created_at) <= NOW() - INTERVAL '5 minutes'
        )
        OR (
          -- Reclaim workers that died mid-flight (always reclaim stuck processing)
          r.status = 'processing'
          AND coalesce(r.last_attempt_at, r.created_at) <= NOW() - INTERVAL '10 minutes'
        )
      )
    ORDER BY r.eligible_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.profile_completion_reminders r
  SET
    status = 'processing',
    last_attempt_at = NOW(),
    updated_at = NOW()
  FROM due
  WHERE r.id = due.id
  RETURNING r.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_profile_completion_reminders(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_profile_completion_reminders(INT) TO service_role;

-- ─── 5. Optional cron (vault-gated, like goodbye retry) ───────────────────

DO $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'profile completion reminder cron skipped (extensions): %', SQLERRM;
    RETURN;
  END;

  BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'profile_completion_reminder_url' LIMIT 1;
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'profile_completion_reminder_auth' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF v_url IS NULL OR v_key IS NULL OR length(trim(v_url)) = 0 OR length(trim(v_key)) = 0 THEN
    RAISE NOTICE 'Skipping profile completion reminder cron: vault secrets not set';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'trabage_profile_completion_reminder';

  PERFORM cron.schedule(
    'trabage_profile_completion_reminder',
    '*/5 * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L,
          'apikey', %L,
          'x-profile-reminder-secret', %L
        ),
        body := jsonb_build_object('source', 'cron', 'limit', 20)
      );
      $cron$,
      trim(v_url),
      trim(v_key),
      trim(v_key),
      trim(v_key)
    )
  );

  RAISE NOTICE 'Scheduled trabage_profile_completion_reminder cron (*/5)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule profile completion reminder cron: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';
