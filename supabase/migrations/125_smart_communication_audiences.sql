-- 125_smart_communication_audiences.sql
-- Dynamic audience segments, automation cooldowns, CTA/conversion tracking.

-- Allow admins / service_role to evaluate completion for any user (audience matching).
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
  v_caller_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'account_type', NULL, 'percent', 0, 'sufficient', false,
      'missing_sections', '[]'::JSONB, 'completed_sections', '[]'::JSONB, 'sections', '[]'::JSONB
    );
  END IF;

  v_caller_role := public.get_my_role();
  IF auth.uid() IS NOT NULL
     AND p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(v_caller_role, '') IS DISTINCT FROM 'admin'
  THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT lower(coalesce(ur.role, '')) INTO v_role
  FROM public.user_roles ur WHERE ur.user_id = p_user_id;

  IF v_role IN ('candidate') THEN v_role := 'personal'; END IF;
  IF v_role IN ('company') THEN v_role := 'business'; END IF;
  IF v_role IN ('institution') THEN v_role := 'organization'; END IF;

  IF v_role = 'business' THEN
    SELECT co.company_type INTO v_company_type
    FROM public.company_profiles co WHERE co.user_id = p_user_id;
    IF coalesce(v_company_type, '') IN ('Institucion publica', 'ONG') THEN
      v_role := 'organization';
    END IF;
  END IF;

  IF v_role = 'organization' THEN v_account_type := 'organization';
  ELSIF v_role = 'business' THEN v_account_type := 'business';
  ELSIF v_role = 'personal' THEN v_account_type := 'personal';
  ELSE
    IF EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = p_user_id) THEN
      SELECT company_type INTO v_company_type FROM public.company_profiles WHERE user_id = p_user_id;
      IF coalesce(v_company_type, '') IN ('Institucion publica', 'ONG') THEN
        v_account_type := 'organization';
      ELSE
        v_account_type := 'business';
      END IF;
    ELSIF EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = p_user_id) THEN
      v_account_type := 'personal';
    ELSE
      RETURN jsonb_build_object(
        'account_type', NULL, 'percent', 0, 'sufficient', false,
        'missing_sections', '[]'::JSONB, 'completed_sections', '[]'::JSONB, 'sections', '[]'::JSONB
      );
    END IF;
  END IF;

  IF v_account_type = 'personal' THEN
    SELECT jsonb_build_array(
      jsonb_build_object('key', 'full_name', 'label', 'Nombre', 'done', coalesce(trim(cp.full_name), '') <> ''),
      jsonb_build_object('key', 'avatar', 'label', 'Foto de perfil', 'done', coalesce(trim(cp.avatar_path), '') <> ''),
      jsonb_build_object('key', 'headline', 'label', 'Titular profesional', 'done', length(coalesce(trim(cp.headline), '')) >= 6),
      jsonb_build_object('key', 'about', 'label', 'Acerca de mí', 'done', length(coalesce(trim(cp.about), '')) >= 30),
      jsonb_build_object('key', 'sector', 'label', 'Sector', 'done', coalesce(trim(cp.sector), '') <> ''),
      jsonb_build_object('key', 'city', 'label', 'Ciudad', 'done', coalesce(trim(cp.city), '') <> ''),
      jsonb_build_object('key', 'experience', 'label', 'Experiencia', 'done', EXISTS (
        SELECT 1 FROM public.experience x WHERE x.user_id = p_user_id
          AND coalesce(trim(x.position), '') <> '' AND coalesce(trim(x.company), '') <> '' AND x.start_date IS NOT NULL)),
      jsonb_build_object('key', 'education', 'label', 'Educación', 'done', EXISTS (
        SELECT 1 FROM public.education e WHERE e.user_id = p_user_id
          AND coalesce(trim(e.institution), '') <> ''
          AND coalesce(trim(coalesce(e.program, e.specialty)), '') <> '')),
      jsonb_build_object('key', 'skills', 'label', 'Habilidades',
        'done', (SELECT count(*) FROM public.skills s WHERE s.user_id = p_user_id) >= 1),
      jsonb_build_object('key', 'languages', 'label', 'Idiomas',
        'done', EXISTS (SELECT 1 FROM public.languages l WHERE l.user_id = p_user_id)),
      jsonb_build_object('key', 'services', 'label', 'Servicios',
        'done', EXISTS (SELECT 1 FROM public.services sv WHERE sv.user_id = p_user_id)),
      jsonb_build_object('key', 'certifications', 'label', 'Certificaciones',
        'done', EXISTS (SELECT 1 FROM public.certifications c WHERE c.user_id = p_user_id)),
      jsonb_build_object('key', 'projects', 'label', 'Proyectos',
        'done', EXISTS (SELECT 1 FROM public.projects p WHERE p.user_id = p_user_id)),
      jsonb_build_object('key', 'links', 'label', 'Enlaces / redes', 'done',
        EXISTS (SELECT 1 FROM public.candidate_links cl WHERE cl.user_id = p_user_id)
        OR (cp.social_links IS NOT NULL AND EXISTS (
          SELECT 1 FROM jsonb_each_text(cp.social_links) j WHERE coalesce(trim(j.value), '') <> '')))
    )
    INTO v_sections FROM public.candidate_profiles cp WHERE cp.user_id = p_user_id;
    IF v_sections IS NULL THEN v_sections := '[]'::JSONB; END IF;
  ELSE
    SELECT
      EXISTS (SELECT 1 FROM jsonb_each_text(coalesce(co.social_links, '{}'::JSONB)) j
              WHERE coalesce(trim(j.value), '') <> ''),
      (SELECT count(*) FROM public.company_services cs WHERE cs.company_id = p_user_id)
    INTO v_has_social, v_svc_count
    FROM public.company_profiles co WHERE co.user_id = p_user_id;

    SELECT jsonb_build_array(
      jsonb_build_object('key', 'company_name', 'label', 'Nombre', 'done', coalesce(trim(co.company_name), '') <> ''),
      jsonb_build_object('key', 'logo', 'label', 'Logo', 'done', coalesce(trim(co.logo_path), '') <> ''),
      jsonb_build_object('key', 'description', 'label', 'Descripción', 'done', length(coalesce(trim(co.description), '')) >= 40),
      jsonb_build_object(
        'key', CASE WHEN v_account_type = 'organization' THEN 'company_type' ELSE 'sector' END,
        'label', CASE WHEN v_account_type = 'organization' THEN 'Tipo de organización' ELSE 'Sector' END,
        'done', CASE WHEN v_account_type = 'organization'
          THEN coalesce(trim(co.company_type), '') <> '' ELSE coalesce(trim(co.sector), '') <> '' END),
      jsonb_build_object('key', 'city', 'label', 'Ubicación', 'done', coalesce(trim(co.city), '') <> ''),
      jsonb_build_object('key', 'website', 'label', 'Sitio web', 'done', coalesce(trim(co.website), '') <> ''),
      jsonb_build_object('key', 'social', 'label', 'Redes sociales', 'done', coalesce(v_has_social, false)),
      jsonb_build_object('key', 'services', 'label', 'Servicios', 'done', coalesce(v_svc_count, 0) > 0),
      jsonb_build_object('key', 'projects', 'label', 'Proyectos',
        'done', EXISTS (SELECT 1 FROM public.projects p WHERE p.user_id = p_user_id)),
      jsonb_build_object('key', 'cover', 'label', 'Imagen de portada', 'done', coalesce(trim(co.cover_path), '') <> '')
    )
    INTO v_sections FROM public.company_profiles co WHERE co.user_id = p_user_id;
    IF v_sections IS NULL THEN v_sections := '[]'::JSONB; END IF;
  END IF;

  v_total := jsonb_array_length(v_sections);
  v_done := 0;
  FOR r IN SELECT value FROM jsonb_array_elements(v_sections) AS t(value)
  LOOP
    IF COALESCE((r.value->>'done')::BOOLEAN, FALSE) THEN
      v_done := v_done + 1;
      v_completed := array_append(v_completed, r.value->>'label');
    ELSE
      v_missing := array_append(v_missing, r.value->>'label');
    END IF;
  END LOOP;

  v_percent := CASE WHEN v_total > 0 THEN ROUND((v_done::NUMERIC / v_total) * 100)::INT ELSE 0 END;

  IF v_account_type = 'personal' THEN
    v_sufficient := v_percent >= 55
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'full_name' AND (s.value->>'done')::BOOLEAN)
      AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'headline' AND (s.value->>'done')::BOOLEAN)
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'about' AND (s.value->>'done')::BOOLEAN)
      )
      AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'experience' AND (s.value->>'done')::BOOLEAN)
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'education' AND (s.value->>'done')::BOOLEAN)
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'skills' AND (s.value->>'done')::BOOLEAN)
      );
  ELSE
    v_sufficient := v_percent >= 55
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'company_name' AND (s.value->>'done')::BOOLEAN)
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'description' AND (s.value->>'done')::BOOLEAN)
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_sections) s WHERE s.value->>'key' = 'city' AND (s.value->>'done')::BOOLEAN);
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

ALTER TABLE public.communication_campaigns
  ADD COLUMN IF NOT EXISTS automation JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS conversion_goal TEXT NULL
    CHECK (conversion_goal IS NULL OR conversion_goal IN ('profile_complete', 'cta_click'));

ALTER TABLE public.communication_user_states
  ADD COLUMN IF NOT EXISTS cta_clicked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ NULL;

-- Single segment rule evaluation
CREATE OR REPLACE FUNCTION public.communication_user_matches_rule(
  p_user_id UUID,
  p_rule JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id TEXT := COALESCE(p_rule->>'id', '');
  v_completion JSONB;
  v_percent INT;
  v_sufficient BOOLEAN;
  v_days INT;
  v_min INT;
  v_max INT;
  v_created TIMESTAMPTZ;
  v_last_sign_in TIMESTAMPTZ;
  v_section_key TEXT;
BEGIN
  IF p_user_id IS NULL OR p_rule IS NULL OR v_id = '' THEN
    RETURN TRUE;
  END IF;

  SELECT u.created_at, u.last_sign_in_at
  INTO v_created, v_last_sign_in
  FROM auth.users u WHERE u.id = p_user_id;

  IF v_id IN (
    'profile_incomplete', 'profile_pct_lt', 'profile_pct_lte', 'profile_pct_gte',
    'profile_pct_between', 'profile_pct_gt', 'no_avatar', 'no_experience', 'no_education',
    'no_skills', 'no_certifications', 'no_projects', 'no_about', 'no_services', 'no_description'
  ) THEN
    v_completion := public.get_profile_completion(p_user_id);
    v_percent := COALESCE((v_completion->>'percent')::INT, 0);
    v_sufficient := COALESCE((v_completion->>'sufficient')::BOOLEAN, FALSE);
  END IF;

  CASE v_id
    WHEN 'profile_incomplete' THEN
      RETURN NOT v_sufficient;

    WHEN 'profile_pct_lt' THEN
      RETURN v_percent < COALESCE((p_rule->>'value')::INT, 50);

    WHEN 'profile_pct_lte' THEN
      RETURN v_percent <= COALESCE((p_rule->>'value')::INT, 50);

    WHEN 'profile_pct_gte' THEN
      RETURN v_percent >= COALESCE((p_rule->>'value')::INT, 70);

    WHEN 'profile_pct_gt' THEN
      RETURN v_percent > COALESCE((p_rule->>'value')::INT, 70);

    WHEN 'profile_pct_between' THEN
      v_min := COALESCE((p_rule->>'min')::INT, 0);
      v_max := COALESCE((p_rule->>'max')::INT, 100);
      RETURN v_percent >= v_min AND v_percent <= v_max;

    WHEN 'no_avatar' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' IN ('avatar', 'logo') AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_experience' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = 'experience' AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_education' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = 'education' AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_skills' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = 'skills' AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_certifications' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = 'certifications' AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_projects' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = 'projects' AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_about' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = 'about' AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_description' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = 'description' AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_services' THEN
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = 'services' AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'missing_section' THEN
      v_section_key := COALESCE(p_rule->>'value', '');
      v_completion := COALESCE(v_completion, public.get_profile_completion(p_user_id));
      RETURN EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(v_completion->'sections', '[]'::jsonb)) s
        WHERE s.value->>'key' = v_section_key AND NOT COALESCE((s.value->>'done')::BOOLEAN, FALSE)
      );

    WHEN 'no_posts' THEN
      RETURN NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.author_id = p_user_id);

    WHEN 'no_connections' THEN
      RETURN NOT EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.user_id = p_user_id OR f.target_id = p_user_id
      );

    WHEN 'no_applications' THEN
      RETURN NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.candidate_id = p_user_id);

    WHEN 'no_jobs' THEN
      RETURN NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.company_id = p_user_id);

    WHEN 'no_org_content' THEN
      RETURN NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.author_id = p_user_id)
         AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.company_id = p_user_id);

    WHEN 'inactive_days' THEN
      v_days := COALESCE((p_rule->>'days')::INT, 30);
      RETURN v_last_sign_in IS NULL
        OR v_last_sign_in <= NOW() - make_interval(days => v_days);

    WHEN 'registered_within_days' THEN
      v_days := COALESCE((p_rule->>'days')::INT, 7);
      RETURN v_created IS NOT NULL AND v_created >= NOW() - make_interval(days => v_days);

    WHEN 'registered_days_gte' THEN
      v_days := COALESCE((p_rule->>'days')::INT, 7);
      RETURN v_created IS NOT NULL AND v_created <= NOW() - make_interval(days => v_days);

    WHEN 'never_survey_response' THEN
      RETURN NOT EXISTS (
        SELECT 1
        FROM public.communication_responses r
        JOIN public.communication_campaigns c ON c.id = r.campaign_id
        WHERE r.user_id = p_user_id
          AND c.campaign_type IN ('feedback', 'survey')
      );

    ELSE
      RETURN TRUE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.communication_user_matches_audience(
  p_user_id UUID,
  p_audience JSONB,
  p_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := p_role;
  v_rules JSONB;
  v_logic TEXT;
  v_rule JSONB;
  v_any BOOLEAN := FALSE;
  v_all BOOLEAN := TRUE;
  v_match BOOLEAN;
  v_has_rules BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_role IS NULL THEN
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
  END IF;

  IF NOT public.communication_audience_matches(
    COALESCE(p_audience, '{"all": true}'::jsonb),
    v_role,
    FALSE
  ) THEN
    RETURN FALSE;
  END IF;

  v_rules := COALESCE(p_audience->'rules', '[]'::jsonb);
  IF jsonb_typeof(v_rules) <> 'array' OR jsonb_array_length(v_rules) = 0 THEN
    RETURN TRUE;
  END IF;

  v_logic := lower(COALESCE(p_audience->>'rule_logic', 'and'));
  FOR v_rule IN SELECT * FROM jsonb_array_elements(v_rules)
  LOOP
    v_has_rules := TRUE;
    v_match := public.communication_user_matches_rule(p_user_id, v_rule);
    v_any := v_any OR v_match;
    v_all := v_all AND v_match;
  END LOOP;

  IF NOT v_has_rules THEN
    RETURN TRUE;
  END IF;

  IF v_logic = 'or' THEN
    RETURN v_any;
  END IF;
  RETURN v_all;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_count_communication_audience(p_audience JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM public.user_roles ur
  WHERE ur.role IN ('personal', 'business', 'organization')
    AND public.communication_user_matches_audience(ur.user_id, COALESCE(p_audience, '{"all": true}'::jsonb), ur.role);

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Automation + conversion columns in list/upsert
CREATE OR REPLACE FUNCTION public.admin_upsert_communication_campaign(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_row public.communication_campaigns%ROWTYPE;
  v_audience JSONB;
  v_cached INT;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_id := NULLIF(p_payload->>'id', '')::UUID;
  v_audience := COALESCE(p_payload->'audience', '{"all": true}'::jsonb);

  BEGIN
    v_cached := public.admin_count_communication_audience(v_audience);
    v_audience := jsonb_set(v_audience, '{cached_count}', to_jsonb(v_cached), TRUE);
  EXCEPTION WHEN OTHERS THEN
    v_audience := v_audience;
  END;

  IF v_id IS NULL THEN
    INSERT INTO public.communication_campaigns (
      title, description, campaign_type, audience, starts_at, ends_at,
      behavior, allow_dismiss, primary_cta_label, secondary_cta_label,
      link_type, link_url, send_push, is_active, resend_interval_days,
      content, automation, conversion_goal, created_by
    ) VALUES (
      trim(p_payload->>'title'),
      COALESCE(p_payload->>'description', ''),
      COALESCE(p_payload->>'campaign_type', 'info'),
      v_audience,
      COALESCE((p_payload->>'starts_at')::TIMESTAMPTZ, NOW()),
      NULLIF(p_payload->>'ends_at', '')::TIMESTAMPTZ,
      COALESCE(p_payload->>'behavior', 'once'),
      COALESCE((p_payload->>'allow_dismiss')::BOOLEAN, TRUE),
      COALESCE(NULLIF(trim(p_payload->>'primary_cta_label'), ''), 'Ver más'),
      NULLIF(trim(p_payload->>'secondary_cta_label'), ''),
      COALESCE(p_payload->>'link_type', 'none'),
      NULLIF(trim(p_payload->>'link_url'), ''),
      COALESCE((p_payload->>'send_push')::BOOLEAN, FALSE),
      COALESCE((p_payload->>'is_active')::BOOLEAN, TRUE),
      NULLIF(p_payload->>'resend_interval_days', '')::INT,
      COALESCE(p_payload->'content', '{}'::jsonb),
      COALESCE(p_payload->'automation', '{}'::jsonb),
      NULLIF(p_payload->>'conversion_goal', ''),
      auth.uid()
    )
    RETURNING * INTO v_row;

    INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
    VALUES (v_row.id, auth.uid(), 'created', '{}'::jsonb);
  ELSE
    UPDATE public.communication_campaigns c
    SET
      title = COALESCE(NULLIF(trim(p_payload->>'title'), ''), c.title),
      description = COALESCE(p_payload->>'description', c.description),
      campaign_type = COALESCE(p_payload->>'campaign_type', c.campaign_type),
      audience = COALESCE(v_audience, c.audience),
      starts_at = COALESCE((p_payload->>'starts_at')::TIMESTAMPTZ, c.starts_at),
      ends_at = CASE
        WHEN p_payload ? 'ends_at' AND NULLIF(p_payload->>'ends_at', '') IS NULL THEN NULL
        WHEN p_payload ? 'ends_at' THEN (p_payload->>'ends_at')::TIMESTAMPTZ
        ELSE c.ends_at
      END,
      behavior = COALESCE(p_payload->>'behavior', c.behavior),
      allow_dismiss = COALESCE((p_payload->>'allow_dismiss')::BOOLEAN, c.allow_dismiss),
      primary_cta_label = COALESCE(NULLIF(trim(p_payload->>'primary_cta_label'), ''), c.primary_cta_label),
      secondary_cta_label = CASE
        WHEN p_payload ? 'secondary_cta_label' THEN NULLIF(trim(p_payload->>'secondary_cta_label'), '')
        ELSE c.secondary_cta_label
      END,
      link_type = COALESCE(p_payload->>'link_type', c.link_type),
      link_url = CASE
        WHEN p_payload ? 'link_url' THEN NULLIF(trim(p_payload->>'link_url'), '')
        ELSE c.link_url
      END,
      send_push = COALESCE((p_payload->>'send_push')::BOOLEAN, c.send_push),
      is_active = COALESCE((p_payload->>'is_active')::BOOLEAN, c.is_active),
      resend_interval_days = CASE
        WHEN p_payload ? 'resend_interval_days'
          AND NULLIF(p_payload->>'resend_interval_days', '') IS NULL THEN NULL
        WHEN p_payload ? 'resend_interval_days'
          THEN (p_payload->>'resend_interval_days')::INT
        ELSE c.resend_interval_days
      END,
      content = COALESCE(p_payload->'content', c.content),
      automation = COALESCE(p_payload->'automation', c.automation),
      conversion_goal = CASE
        WHEN p_payload ? 'conversion_goal' THEN NULLIF(p_payload->>'conversion_goal', '')
        ELSE c.conversion_goal
      END,
      updated_at = NOW()
    WHERE c.id = v_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'campaign not found';
    END IF;

    INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
    VALUES (v_row.id, auth.uid(), 'updated', '{}'::jsonb);
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_communication_campaigns()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY sort_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'description', c.description,
        'campaign_type', c.campaign_type,
        'audience', c.audience,
        'starts_at', c.starts_at,
        'ends_at', c.ends_at,
        'behavior', c.behavior,
        'allow_dismiss', c.allow_dismiss,
        'primary_cta_label', c.primary_cta_label,
        'secondary_cta_label', c.secondary_cta_label,
        'link_type', c.link_type,
        'link_url', c.link_url,
        'send_push', c.send_push,
        'is_active', c.is_active,
        'resend_interval_days', c.resend_interval_days,
        'content', c.content,
        'automation', c.automation,
        'conversion_goal', c.conversion_goal,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'lifecycle_status', public.communication_campaign_lifecycle_status(
          c.is_active, c.starts_at, c.ends_at
        ),
        'stats', jsonb_build_object(
          'targeted', COALESCE(
            NULLIF((c.audience->>'cached_count')::INT, NULL),
            (
              SELECT COUNT(*)::INT
              FROM public.user_roles ur
              WHERE ur.role IN ('personal', 'business', 'organization')
                AND public.communication_audience_matches(c.audience, ur.role, FALSE)
            )
          ),
          'responded', COALESCE(s.responded, 0),
          'pending', COALESCE(s.pending, 0),
          'dismissed', COALESCE(s.dismissed, 0),
          'cta_clicked', COALESCE(s.cta_clicked, 0),
          'converted', COALESCE(s.converted, 0),
          'response_rate', CASE
            WHEN COALESCE(s.shown, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(s.responded, 0)::NUMERIC / s.shown) * 100, 1)
          END
        )
      ) AS row_data,
      c.created_at AS sort_at
    FROM public.communication_campaigns c
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE us.status = 'responded')::INT AS responded,
        COUNT(*) FILTER (WHERE us.status IN ('not_shown', 'shown', 'opened'))::INT AS pending,
        COUNT(*) FILTER (WHERE us.status = 'dismissed')::INT AS dismissed,
        COUNT(*) FILTER (WHERE us.cta_clicked_at IS NOT NULL)::INT AS cta_clicked,
        COUNT(*) FILTER (WHERE us.converted_at IS NOT NULL)::INT AS converted,
        COUNT(*) FILTER (WHERE us.shown_at IS NOT NULL)::INT AS shown
      FROM public.communication_user_states us
      WHERE us.campaign_id = c.id
    ) s ON TRUE
  ) q;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_communications_for_me()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_uid LIMIT 1;
  IF v_role IS NULL OR v_role = 'admin' THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Mark conversions for profile-complete goals before filtering.
  PERFORM public.mark_communication_conversions_for_user(v_uid);

  UPDATE public.communication_user_states us
  SET status = 'expired', updated_at = NOW()
  FROM public.communication_campaigns c
  WHERE us.campaign_id = c.id
    AND us.user_id = v_uid
    AND us.status NOT IN ('responded', 'expired')
    AND c.ends_at IS NOT NULL
    AND c.ends_at <= NOW();

  SELECT COALESCE(jsonb_agg(item ORDER BY sort_at ASC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      jsonb_build_object(
        'id', c.id,
        'title', c.title,
        'description', c.description,
        'campaign_type', c.campaign_type,
        'behavior', c.behavior,
        'allow_dismiss', c.allow_dismiss,
        'primary_cta_label', c.primary_cta_label,
        'secondary_cta_label', c.secondary_cta_label,
        'link_type', c.link_type,
        'link_url', c.link_url,
        'content', c.content,
        'conversion_goal', c.conversion_goal,
        'starts_at', c.starts_at,
        'ends_at', c.ends_at,
        'user_status', COALESCE(us.status, 'not_shown'),
        'shown_at', us.shown_at,
        'opened_at', us.opened_at,
        'last_resent_at', us.last_resent_at
      ) AS item,
      c.starts_at AS sort_at
    FROM public.communication_campaigns c
    LEFT JOIN public.communication_user_states us
      ON us.campaign_id = c.id AND us.user_id = v_uid
    WHERE c.is_active = TRUE
      AND c.starts_at <= NOW()
      AND (c.ends_at IS NULL OR c.ends_at > NOW())
      AND public.communication_user_matches_audience(v_uid, c.audience, v_role)
      AND COALESCE(us.converted_at, NULL) IS NULL
      AND COALESCE(us.status, 'not_shown') IS DISTINCT FROM 'responded'
      AND COALESCE(us.status, 'not_shown') IS DISTINCT FROM 'expired'
      AND (
        us.id IS NULL
        OR us.status = 'not_shown'
        OR (
          us.status IN ('shown', 'opened')
          AND c.behavior IN ('once', 'until_respond', 'until_dismiss', 'always')
        )
        OR (us.status = 'dismissed' AND c.behavior = 'always')
        OR (
          us.status = 'dismissed'
          AND c.resend_interval_days IS NOT NULL
          AND us.dismissed_at IS NOT NULL
          AND us.dismissed_at <= NOW() - make_interval(days => c.resend_interval_days)
        )
      )
      -- Global reminder cooldown (automation.min_interval_days, default 15 when automation enabled)
      AND (
        us.shown_at IS NULL
        OR us.last_resent_at IS NOT NULL
        OR NOT COALESCE((c.automation->>'enabled')::BOOLEAN, FALSE)
        OR us.shown_at <= NOW() - make_interval(
          days => COALESCE(
            NULLIF((c.automation->>'min_interval_days')::INT, NULL),
            c.resend_interval_days,
            15
          )
        )
        OR us.status IN ('shown', 'opened')
      )
  ) q;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_communication_conversions_for_user(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_completion JSONB;
  v_sufficient BOOLEAN;
  v_updated INT := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  v_completion := public.get_profile_completion(p_user_id);
  v_sufficient := COALESCE((v_completion->>'sufficient')::BOOLEAN, FALSE);
  IF NOT v_sufficient THEN
    RETURN 0;
  END IF;

  UPDATE public.communication_user_states us
  SET
    converted_at = NOW(),
    updated_at = NOW(),
    status = CASE WHEN us.status = 'responded' THEN us.status ELSE us.status END
  FROM public.communication_campaigns c
  WHERE us.campaign_id = c.id
    AND us.user_id = p_user_id
    AND us.converted_at IS NULL
    AND us.shown_at IS NOT NULL
    AND c.conversion_goal = 'profile_complete';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
    SELECT us.campaign_id, p_user_id, 'responded',
           jsonb_build_object('conversion', 'profile_complete')
    FROM public.communication_user_states us
    JOIN public.communication_campaigns c ON c.id = us.campaign_id
    WHERE us.user_id = p_user_id
      AND us.converted_at IS NOT NULL
      AND c.conversion_goal = 'profile_complete'
      AND us.converted_at >= NOW() - INTERVAL '1 minute';
  END IF;

  RETURN v_updated;
END;
$$;

-- Patch record_communication_event to stamp cta_clicked_at
CREATE OR REPLACE FUNCTION public.record_communication_event(
  p_campaign_id UUID,
  p_event_type TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_state public.communication_user_states%ROWTYPE;
  v_next TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_event_type NOT IN ('shown', 'opened', 'dismissed', 'cta_primary', 'cta_secondary') THEN
    RAISE EXCEPTION 'invalid event type';
  END IF;

  INSERT INTO public.communication_user_states (campaign_id, user_id, status)
  VALUES (p_campaign_id, v_uid, 'not_shown')
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  SELECT * INTO v_state
  FROM public.communication_user_states
  WHERE campaign_id = p_campaign_id AND user_id = v_uid
  FOR UPDATE;

  IF v_state.status = 'responded' AND v_state.converted_at IS NOT NULL THEN
    RETURN to_jsonb(v_state);
  END IF;

  IF p_event_type = 'shown' THEN
    v_next := CASE WHEN v_state.status = 'not_shown' THEN 'shown' ELSE v_state.status END;
    UPDATE public.communication_user_states
    SET status = v_next, shown_at = COALESCE(shown_at, NOW()), updated_at = NOW()
    WHERE id = v_state.id
    RETURNING * INTO v_state;
  ELSIF p_event_type = 'opened' THEN
    UPDATE public.communication_user_states
    SET
      status = CASE WHEN status IN ('responded', 'dismissed') THEN status ELSE 'opened' END,
      shown_at = COALESCE(shown_at, NOW()),
      opened_at = COALESCE(opened_at, NOW()),
      updated_at = NOW()
    WHERE id = v_state.id
    RETURNING * INTO v_state;
  ELSIF p_event_type = 'dismissed' THEN
    UPDATE public.communication_user_states
    SET
      status = CASE WHEN status = 'responded' THEN status ELSE 'dismissed' END,
      dismissed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_state.id
    RETURNING * INTO v_state;
  ELSE
    UPDATE public.communication_user_states
    SET
      status = CASE WHEN status IN ('responded', 'dismissed') THEN status ELSE 'opened' END,
      shown_at = COALESCE(shown_at, NOW()),
      opened_at = COALESCE(opened_at, NOW()),
      cta_clicked_at = CASE
        WHEN p_event_type = 'cta_primary' THEN COALESCE(cta_clicked_at, NOW())
        ELSE cta_clicked_at
      END,
      converted_at = CASE
        WHEN EXISTS (
          SELECT 1 FROM public.communication_campaigns c
          WHERE c.id = p_campaign_id AND c.conversion_goal = 'cta_click'
        ) AND p_event_type = 'cta_primary'
        THEN COALESCE(converted_at, NOW())
        ELSE converted_at
      END,
      updated_at = NOW()
    WHERE id = v_state.id
    RETURNING * INTO v_state;
  END IF;

  INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
  VALUES (p_campaign_id, v_uid, p_event_type, COALESCE(p_meta, '{}'::jsonb));

  RETURN to_jsonb(v_state);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_communication_campaign_stats(
  p_campaign_id UUID,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_campaign public.communication_campaigns%ROWTYPE;
  v_role TEXT := NULLIF(p_filters->>'account_type', '');
  v_city TEXT := NULLIF(trim(p_filters->>'city'), '');
  v_country TEXT := NULLIF(trim(p_filters->>'country'), '');
  v_from TIMESTAMPTZ := NULLIF(p_filters->>'date_from', '')::TIMESTAMPTZ;
  v_to TIMESTAMPTZ := NULLIF(p_filters->>'date_to', '')::TIMESTAMPTZ;
  v_app_version TEXT := NULLIF(trim(p_filters->>'app_version'), '');
  v_targeted INT := 0;
  v_shown INT := 0;
  v_opened INT := 0;
  v_responded INT := 0;
  v_dismissed INT := 0;
  v_pending INT := 0;
  v_cta INT := 0;
  v_converted INT := 0;
  v_avg NUMERIC := NULL;
  v_dist JSONB := '[]'::jsonb;
  v_by_day JSONB := '[]'::jsonb;
  v_comments JSONB := '[]'::jsonb;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_campaign FROM public.communication_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;

  v_targeted := COALESCE(NULLIF((v_campaign.audience->>'cached_count')::INT, NULL), 0);
  IF v_targeted = 0 THEN
    v_targeted := public.admin_count_communication_audience(v_campaign.audience);
  END IF;

  WITH filtered_states AS (
    SELECT us.*
    FROM public.communication_user_states us
    LEFT JOIN public.user_roles ur ON ur.user_id = us.user_id
    LEFT JOIN public.candidate_profiles cp ON cp.user_id = us.user_id
    LEFT JOIN public.company_profiles co ON co.user_id = us.user_id
    LEFT JOIN public.communication_responses r ON r.campaign_id = us.campaign_id AND r.user_id = us.user_id
    WHERE us.campaign_id = p_campaign_id
      AND (v_role IS NULL OR ur.role = v_role OR r.account_type = v_role)
      AND (v_city IS NULL OR lower(COALESCE(cp.city, co.city, '')) = lower(v_city))
      AND (v_country IS NULL OR lower(COALESCE(cp.country, co.country, '')) = lower(v_country))
      AND (v_app_version IS NULL OR r.app_version = v_app_version)
      AND (v_from IS NULL OR COALESCE(us.responded_at, us.shown_at, us.created_at) >= v_from)
      AND (v_to IS NULL OR COALESCE(us.responded_at, us.shown_at, us.created_at) <= v_to)
  )
  SELECT
    COUNT(*) FILTER (WHERE shown_at IS NOT NULL)::INT,
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL OR status IN ('opened', 'responded'))::INT,
    COUNT(*) FILTER (WHERE status = 'responded')::INT,
    COUNT(*) FILTER (WHERE status = 'dismissed')::INT,
    COUNT(*) FILTER (WHERE status IN ('not_shown', 'shown', 'opened'))::INT,
    COUNT(*) FILTER (WHERE cta_clicked_at IS NOT NULL)::INT,
    COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::INT
  INTO v_shown, v_opened, v_responded, v_dismissed, v_pending, v_cta, v_converted
  FROM filtered_states;

  SELECT ROUND(AVG(r.rating)::NUMERIC, 2) INTO v_avg
  FROM public.communication_responses r
  WHERE r.campaign_id = p_campaign_id AND r.rating IS NOT NULL
    AND (v_role IS NULL OR r.account_type = v_role)
    AND (v_app_version IS NULL OR r.app_version = v_app_version)
    AND (v_from IS NULL OR r.created_at >= v_from)
    AND (v_to IS NULL OR r.created_at <= v_to);

  SELECT COALESCE(jsonb_agg(jsonb_build_object('rating', g.rating, 'count', g.cnt) ORDER BY g.rating), '[]'::jsonb)
  INTO v_dist
  FROM (
    SELECT r.rating, COUNT(*)::INT AS cnt
    FROM public.communication_responses r
    WHERE r.campaign_id = p_campaign_id AND r.rating IS NOT NULL
      AND (v_role IS NULL OR r.account_type = v_role)
    GROUP BY r.rating
  ) g;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d.day, 'count', d.cnt) ORDER BY d.day), '[]'::jsonb)
  INTO v_by_day
  FROM (
    SELECT to_char(date_trunc('day', r.created_at), 'YYYY-MM-DD') AS day, COUNT(*)::INT AS cnt
    FROM public.communication_responses r
    WHERE r.campaign_id = p_campaign_id
    GROUP BY 1
  ) d;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id, 'user_id', r.user_id, 'rating', r.rating,
      'improvement_text', r.improvement_text, 'comment_text', r.comment_text,
      'app_version', r.app_version, 'account_type', r.account_type, 'created_at', r.created_at
    ) ORDER BY r.created_at DESC
  ), '[]'::jsonb)
  INTO v_comments
  FROM public.communication_responses r
  WHERE r.campaign_id = p_campaign_id
    AND (
      NULLIF(trim(COALESCE(r.improvement_text, '')), '') IS NOT NULL
      OR NULLIF(trim(COALESCE(r.comment_text, '')), '') IS NOT NULL
    );

  RETURN jsonb_build_object(
    'campaign_id', p_campaign_id,
    'lifecycle_status', public.communication_campaign_lifecycle_status(
      v_campaign.is_active, v_campaign.starts_at, v_campaign.ends_at
    ),
    'conversion_goal', v_campaign.conversion_goal,
    'targeted', v_targeted,
    'shown', v_shown,
    'opened', v_opened,
    'responded', v_responded,
    'dismissed', v_dismissed,
    'pending', v_pending,
    'cta_clicked', v_cta,
    'converted', v_converted,
    'open_rate', CASE WHEN v_shown = 0 THEN 0 ELSE ROUND((v_opened::NUMERIC / v_shown) * 100, 1) END,
    'response_rate', CASE WHEN v_shown = 0 THEN 0 ELSE ROUND((v_responded::NUMERIC / v_shown) * 100, 1) END,
    'cta_rate', CASE WHEN v_shown = 0 THEN 0 ELSE ROUND((v_cta::NUMERIC / v_shown) * 100, 1) END,
    'conversion_rate', CASE WHEN v_shown = 0 THEN 0 ELSE ROUND((v_converted::NUMERIC / v_shown) * 100, 1) END,
    'avg_rating', v_avg,
    'rating_distribution', v_dist,
    'responses_by_day', v_by_day,
    'comments', v_comments
  );
END;
$$;

-- Automation processor: enroll matching users + respect cooldown; optional push enqueue via events
CREATE OR REPLACE FUNCTION public.process_communication_automations(p_limit INT DEFAULT 200)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_campaign RECORD;
  v_user RECORD;
  v_enrolled INT := 0;
  v_reset INT := 0;
  v_min_interval INT;
  v_limit INT := GREATEST(COALESCE(p_limit, 200), 1);
BEGIN
  FOR v_campaign IN
    SELECT *
    FROM public.communication_campaigns c
    WHERE c.is_active = TRUE
      AND COALESCE((c.automation->>'enabled')::BOOLEAN, FALSE) = TRUE
      AND c.starts_at <= NOW()
      AND (c.ends_at IS NULL OR c.ends_at > NOW())
  LOOP
    v_min_interval := COALESCE(
      NULLIF((v_campaign.automation->>'min_interval_days')::INT, NULL),
      v_campaign.resend_interval_days,
      15
    );

    FOR v_user IN
      SELECT ur.user_id, ur.role
      FROM public.user_roles ur
      WHERE ur.role IN ('personal', 'business', 'organization')
        AND public.communication_user_matches_audience(ur.user_id, v_campaign.audience, ur.role)
        AND NOT EXISTS (
          SELECT 1 FROM public.communication_user_states us
          WHERE us.campaign_id = v_campaign.id
            AND us.user_id = ur.user_id
            AND (
              us.converted_at IS NOT NULL
              OR us.status = 'responded'
              OR (
                us.shown_at IS NOT NULL
                AND us.shown_at > NOW() - make_interval(days => v_min_interval)
                AND us.status IS DISTINCT FROM 'dismissed'
              )
            )
        )
      LIMIT v_limit
    LOOP
      INSERT INTO public.communication_user_states (campaign_id, user_id, status)
      VALUES (v_campaign.id, v_user.user_id, 'not_shown')
      ON CONFLICT (campaign_id, user_id) DO UPDATE
      SET
        status = CASE
          WHEN communication_user_states.converted_at IS NOT NULL THEN communication_user_states.status
          WHEN communication_user_states.status = 'responded' THEN communication_user_states.status
          WHEN communication_user_states.shown_at IS NOT NULL
            AND communication_user_states.shown_at <= NOW() - make_interval(days => v_min_interval)
          THEN 'not_shown'
          ELSE communication_user_states.status
        END,
        last_resent_at = CASE
          WHEN communication_user_states.shown_at IS NOT NULL
            AND communication_user_states.shown_at <= NOW() - make_interval(days => v_min_interval)
            AND communication_user_states.converted_at IS NULL
            AND communication_user_states.status IS DISTINCT FROM 'responded'
          THEN NOW()
          ELSE communication_user_states.last_resent_at
        END,
        shown_at = CASE
          WHEN communication_user_states.shown_at IS NOT NULL
            AND communication_user_states.shown_at <= NOW() - make_interval(days => v_min_interval)
            AND communication_user_states.converted_at IS NULL
            AND communication_user_states.status IS DISTINCT FROM 'responded'
          THEN NULL
          ELSE communication_user_states.shown_at
        END,
        opened_at = CASE
          WHEN communication_user_states.shown_at IS NOT NULL
            AND communication_user_states.shown_at <= NOW() - make_interval(days => v_min_interval)
            AND communication_user_states.converted_at IS NULL
            AND communication_user_states.status IS DISTINCT FROM 'responded'
          THEN NULL
          ELSE communication_user_states.opened_at
        END,
        dismissed_at = CASE
          WHEN communication_user_states.shown_at IS NOT NULL
            AND communication_user_states.shown_at <= NOW() - make_interval(days => v_min_interval)
            AND communication_user_states.converted_at IS NULL
            AND communication_user_states.status IS DISTINCT FROM 'responded'
          THEN NULL
          ELSE communication_user_states.dismissed_at
        END,
        updated_at = NOW();

      IF FOUND THEN
        v_enrolled := v_enrolled + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('enrolled_or_reset', v_enrolled, 'resets', v_reset);
END;
$$;

-- Optional daily cron (same pattern as other jobs)
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
    RETURN;
  END;

  BEGIN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'trabage_communication_automations';

    PERFORM cron.schedule(
      'trabage_communication_automations',
      '0 */6 * * *',
      $cron$ SELECT public.process_communication_automations(500); $cron$
    );
    RAISE NOTICE 'Scheduled trabage_communication_automations every 6h';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule communication automations cron: %', SQLERRM;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.communication_user_matches_rule(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.communication_user_matches_audience(UUID, JSONB, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_count_communication_audience(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_communication_conversions_for_user(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_communication_automations(INT) TO service_role;

-- Verify posts/jobs/applications column names used above
-- posts.author_id, applications.candidate_id, jobs.company_id, follows.follower_id/following_id
