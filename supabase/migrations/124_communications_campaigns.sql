-- 124_communications_campaigns.sql
-- Official TrabaGE ↔ users communications centre (campaigns, user states, responses).

CREATE TABLE IF NOT EXISTS public.communication_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  campaign_type TEXT NOT NULL CHECK (
    campaign_type IN (
      'info', 'feedback', 'survey', 'legal', 'feature', 'maintenance', 'promotion', 'other'
    )
  ),
  -- Audience: { "all": true } or { "roles": ["personal","business","organization","guest"] }
  audience JSONB NOT NULL DEFAULT '{"all": true}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NULL,
  -- once | until_respond | until_dismiss | always
  behavior TEXT NOT NULL DEFAULT 'once' CHECK (
    behavior IN ('once', 'until_respond', 'until_dismiss', 'always')
  ),
  allow_dismiss BOOLEAN NOT NULL DEFAULT TRUE,
  primary_cta_label TEXT NOT NULL DEFAULT 'Ver más',
  secondary_cta_label TEXT NULL,
  -- none | internal | external | document
  link_type TEXT NOT NULL DEFAULT 'none' CHECK (
    link_type IN ('none', 'internal', 'external', 'document')
  ),
  link_url TEXT NULL,
  send_push BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- NULL = never resend; otherwise days between resends to eligible users
  resend_interval_days INT NULL CHECK (
    resend_interval_days IS NULL OR resend_interval_days IN (3, 7, 15, 30)
  ),
  -- Optional copy overrides for feedback/survey UI
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT communication_campaigns_window_chk
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_communication_campaigns_active_window
  ON public.communication_campaigns (is_active, starts_at, ends_at)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_communication_campaigns_type
  ON public.communication_campaigns (campaign_type);

CREATE TABLE IF NOT EXISTS public.communication_user_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.communication_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- not_shown | shown | opened | responded | dismissed | expired
  status TEXT NOT NULL DEFAULT 'not_shown' CHECK (
    status IN ('not_shown', 'shown', 'opened', 'responded', 'dismissed', 'expired')
  ),
  shown_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  responded_at TIMESTAMPTZ NULL,
  dismissed_at TIMESTAMPTZ NULL,
  last_resent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_communication_user_states_user
  ON public.communication_user_states (user_id, status);

CREATE INDEX IF NOT EXISTS idx_communication_user_states_campaign
  ON public.communication_user_states (campaign_id, status);

CREATE TABLE IF NOT EXISTS public.communication_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.communication_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NULL CHECK (rating IS NULL OR (rating BETWEEN 1 AND 10)),
  improvement_text TEXT NULL,
  comment_text TEXT NULL,
  app_version TEXT NULL,
  account_type TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_communication_responses_campaign
  ON public.communication_responses (campaign_id, created_at DESC);

-- Append-only event log (historial) — no duplicated campaign payload.
CREATE TABLE IF NOT EXISTS public.communication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.communication_campaigns(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'shown', 'opened', 'responded', 'dismissed', 'cta_primary',
      'cta_secondary', 'resent', 'expired', 'created', 'updated', 'deactivated'
    )
  ),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_events_campaign
  ON public.communication_events (campaign_id, created_at DESC);

ALTER TABLE public.communication_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_user_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS communication_campaigns_admin_all ON public.communication_campaigns;
CREATE POLICY communication_campaigns_admin_all
  ON public.communication_campaigns
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS communication_campaigns_auth_select_active ON public.communication_campaigns;
CREATE POLICY communication_campaigns_auth_select_active
  ON public.communication_campaigns
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW())
  );

DROP POLICY IF EXISTS communication_user_states_own ON public.communication_user_states;
CREATE POLICY communication_user_states_own
  ON public.communication_user_states
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS communication_responses_own_insert ON public.communication_responses;
CREATE POLICY communication_responses_own_insert
  ON public.communication_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS communication_responses_select ON public.communication_responses;
CREATE POLICY communication_responses_select
  ON public.communication_responses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS communication_events_admin_select ON public.communication_events;
CREATE POLICY communication_events_admin_select
  ON public.communication_events
  FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin' OR user_id = auth.uid());

DROP POLICY IF EXISTS communication_events_insert_own ON public.communication_events;
CREATE POLICY communication_events_insert_own
  ON public.communication_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.get_my_role() = 'admin');

GRANT SELECT ON public.communication_campaigns TO authenticated;
GRANT ALL ON public.communication_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.communication_user_states TO authenticated;
GRANT SELECT, INSERT ON public.communication_responses TO authenticated;
GRANT SELECT, INSERT ON public.communication_events TO authenticated;

CREATE OR REPLACE FUNCTION public.communication_campaign_lifecycle_status(
  p_is_active BOOLEAN,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NOT COALESCE(p_is_active, FALSE) THEN 'inactive'
    WHEN p_ends_at IS NOT NULL AND p_ends_at <= NOW() THEN 'ended'
    WHEN p_starts_at > NOW() THEN 'scheduled'
    ELSE 'active'
  END;
$$;

CREATE OR REPLACE FUNCTION public.communication_audience_matches(
  p_audience JSONB,
  p_role TEXT,
  p_is_guest BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_roles TEXT[];
BEGIN
  IF p_audience IS NULL THEN
    RETURN TRUE;
  END IF;
  IF COALESCE((p_audience->>'all')::BOOLEAN, FALSE) THEN
    RETURN TRUE;
  END IF;
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(COALESCE(p_audience->'roles', '[]'::jsonb))
  ) INTO v_roles;
  IF p_is_guest THEN
    RETURN 'guest' = ANY (v_roles);
  END IF;
  RETURN p_role = ANY (v_roles);
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
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'lifecycle_status', public.communication_campaign_lifecycle_status(
          c.is_active, c.starts_at, c.ends_at
        ),
        'stats', jsonb_build_object(
          'targeted', COALESCE(s.targeted, 0),
          'responded', COALESCE(s.responded, 0),
          'pending', COALESCE(s.pending, 0),
          'dismissed', COALESCE(s.dismissed, 0),
          'response_rate', CASE
            WHEN COALESCE(s.targeted, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(s.responded, 0)::NUMERIC / s.targeted) * 100, 1)
          END
        )
      ) AS row_data,
      c.created_at AS sort_at
    FROM public.communication_campaigns c
    LEFT JOIN LATERAL (
      SELECT
        (
          SELECT COUNT(*)::INT
          FROM public.user_roles ur
          WHERE ur.role IN ('personal', 'business', 'organization')
            AND public.communication_audience_matches(c.audience, ur.role, FALSE)
        ) AS targeted,
        (
          SELECT COUNT(*)::INT
          FROM public.communication_user_states us
          WHERE us.campaign_id = c.id AND us.status = 'responded'
        ) AS responded,
        (
          SELECT COUNT(*)::INT
          FROM public.communication_user_states us
          WHERE us.campaign_id = c.id
            AND us.status IN ('not_shown', 'shown', 'opened')
        ) AS pending,
        (
          SELECT COUNT(*)::INT
          FROM public.communication_user_states us
          WHERE us.campaign_id = c.id AND us.status = 'dismissed'
        ) AS dismissed
    ) s ON TRUE
  ) q;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_communication_campaign(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_row public.communication_campaigns%ROWTYPE;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_id := NULLIF(p_payload->>'id', '')::UUID;

  IF v_id IS NULL THEN
    INSERT INTO public.communication_campaigns (
      title, description, campaign_type, audience, starts_at, ends_at,
      behavior, allow_dismiss, primary_cta_label, secondary_cta_label,
      link_type, link_url, send_push, is_active, resend_interval_days,
      content, created_by
    ) VALUES (
      trim(p_payload->>'title'),
      COALESCE(p_payload->>'description', ''),
      COALESCE(p_payload->>'campaign_type', 'info'),
      COALESCE(p_payload->'audience', '{"all": true}'::jsonb),
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
      audience = COALESCE(p_payload->'audience', c.audience),
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

CREATE OR REPLACE FUNCTION public.admin_duplicate_communication_campaign(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_src public.communication_campaigns%ROWTYPE;
  v_row public.communication_campaigns%ROWTYPE;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_src FROM public.communication_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;

  INSERT INTO public.communication_campaigns (
    title, description, campaign_type, audience, starts_at, ends_at,
    behavior, allow_dismiss, primary_cta_label, secondary_cta_label,
    link_type, link_url, send_push, is_active, resend_interval_days,
    content, created_by
  ) VALUES (
    v_src.title || ' (copia)',
    v_src.description,
    v_src.campaign_type,
    v_src.audience,
    NOW(),
    v_src.ends_at,
    v_src.behavior,
    v_src.allow_dismiss,
    v_src.primary_cta_label,
    v_src.secondary_cta_label,
    v_src.link_type,
    v_src.link_url,
    FALSE,
    FALSE,
    v_src.resend_interval_days,
    v_src.content,
    auth.uid()
  )
  RETURNING * INTO v_row;

  INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
  VALUES (v_row.id, auth.uid(), 'created', jsonb_build_object('duplicated_from', p_campaign_id));

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_communication_campaign_active(
  p_campaign_id UUID,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.communication_campaigns%ROWTYPE;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.communication_campaigns
  SET is_active = p_is_active, updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;

  INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
  VALUES (
    v_row.id,
    auth.uid(),
    CASE WHEN p_is_active THEN 'updated' ELSE 'deactivated' END,
    jsonb_build_object('is_active', p_is_active)
  );

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_communication_campaign(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM public.communication_campaigns WHERE id = p_campaign_id;
  RETURN FOUND;
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

  WITH filtered_states AS (
    SELECT us.*
    FROM public.communication_user_states us
    LEFT JOIN public.user_roles ur ON ur.user_id = us.user_id
    LEFT JOIN public.candidate_profiles cp ON cp.user_id = us.user_id
    LEFT JOIN public.company_profiles co ON co.user_id = us.user_id
    LEFT JOIN public.communication_responses r ON r.campaign_id = us.campaign_id AND r.user_id = us.user_id
    WHERE us.campaign_id = p_campaign_id
      AND (v_role IS NULL OR ur.role = v_role OR r.account_type = v_role)
      AND (
        v_city IS NULL
        OR lower(COALESCE(cp.city, co.city, '')) = lower(v_city)
      )
      AND (
        v_country IS NULL
        OR lower(COALESCE(cp.country, co.country, '')) = lower(v_country)
      )
      AND (v_app_version IS NULL OR r.app_version = v_app_version)
      AND (v_from IS NULL OR COALESCE(us.responded_at, us.shown_at, us.created_at) >= v_from)
      AND (v_to IS NULL OR COALESCE(us.responded_at, us.shown_at, us.created_at) <= v_to)
  )
  SELECT
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE status IN ('shown', 'opened', 'responded', 'dismissed'))::INT,
    COUNT(*) FILTER (WHERE status IN ('opened', 'responded'))::INT,
    COUNT(*) FILTER (WHERE status = 'responded')::INT,
    COUNT(*) FILTER (WHERE status = 'dismissed')::INT,
    COUNT(*) FILTER (WHERE status IN ('not_shown', 'shown', 'opened'))::INT
  INTO v_targeted, v_shown, v_opened, v_responded, v_dismissed, v_pending
  FROM filtered_states;

  SELECT ROUND(AVG(r.rating)::NUMERIC, 2)
  INTO v_avg
  FROM public.communication_responses r
  WHERE r.campaign_id = p_campaign_id
    AND r.rating IS NOT NULL
    AND (v_role IS NULL OR r.account_type = v_role)
    AND (v_app_version IS NULL OR r.app_version = v_app_version)
    AND (v_from IS NULL OR r.created_at >= v_from)
    AND (v_to IS NULL OR r.created_at <= v_to);

  SELECT COALESCE(jsonb_agg(jsonb_build_object('rating', g.rating, 'count', g.cnt) ORDER BY g.rating), '[]'::jsonb)
  INTO v_dist
  FROM (
    SELECT r.rating, COUNT(*)::INT AS cnt
    FROM public.communication_responses r
    WHERE r.campaign_id = p_campaign_id
      AND r.rating IS NOT NULL
      AND (v_role IS NULL OR r.account_type = v_role)
      AND (v_app_version IS NULL OR r.app_version = v_app_version)
      AND (v_from IS NULL OR r.created_at >= v_from)
      AND (v_to IS NULL OR r.created_at <= v_to)
    GROUP BY r.rating
  ) g;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d.day, 'count', d.cnt) ORDER BY d.day), '[]'::jsonb)
  INTO v_by_day
  FROM (
    SELECT to_char(date_trunc('day', r.created_at), 'YYYY-MM-DD') AS day, COUNT(*)::INT AS cnt
    FROM public.communication_responses r
    WHERE r.campaign_id = p_campaign_id
      AND (v_role IS NULL OR r.account_type = v_role)
      AND (v_app_version IS NULL OR r.app_version = v_app_version)
      AND (v_from IS NULL OR r.created_at >= v_from)
      AND (v_to IS NULL OR r.created_at <= v_to)
    GROUP BY 1
  ) d;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'user_id', r.user_id,
        'rating', r.rating,
        'improvement_text', r.improvement_text,
        'comment_text', r.comment_text,
        'app_version', r.app_version,
        'account_type', r.account_type,
        'created_at', r.created_at
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_comments
  FROM public.communication_responses r
  WHERE r.campaign_id = p_campaign_id
    AND (
      NULLIF(trim(COALESCE(r.improvement_text, '')), '') IS NOT NULL
      OR NULLIF(trim(COALESCE(r.comment_text, '')), '') IS NOT NULL
    )
    AND (v_role IS NULL OR r.account_type = v_role)
    AND (v_app_version IS NULL OR r.app_version = v_app_version)
    AND (v_from IS NULL OR r.created_at >= v_from)
    AND (v_to IS NULL OR r.created_at <= v_to);

  RETURN jsonb_build_object(
    'campaign_id', p_campaign_id,
    'lifecycle_status', public.communication_campaign_lifecycle_status(
      v_campaign.is_active, v_campaign.starts_at, v_campaign.ends_at
    ),
    'targeted', v_targeted,
    'shown', v_shown,
    'opened', v_opened,
    'responded', v_responded,
    'dismissed', v_dismissed,
    'pending', v_pending,
    'open_rate', CASE WHEN v_shown = 0 THEN 0 ELSE ROUND((v_opened::NUMERIC / v_shown) * 100, 1) END,
    'response_rate', CASE WHEN v_targeted = 0 THEN 0 ELSE ROUND((v_responded::NUMERIC / v_targeted) * 100, 1) END,
    'avg_rating', v_avg,
    'rating_distribution', v_dist,
    'responses_by_day', v_by_day,
    'comments', v_comments
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resend_communication_campaign(
  p_campaign_id UUID,
  p_mode TEXT DEFAULT 'pending',
  p_interval_days INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INT := 0;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_mode NOT IN ('pending', 'dismissed', 'never_opened') THEN
    RAISE EXCEPTION 'invalid resend mode';
  END IF;

  IF p_interval_days IS NOT NULL THEN
    UPDATE public.communication_campaigns
    SET resend_interval_days = p_interval_days, updated_at = NOW()
    WHERE id = p_campaign_id;
  END IF;

  WITH eligible AS (
    SELECT us.id
    FROM public.communication_user_states us
    WHERE us.campaign_id = p_campaign_id
      AND us.status IS DISTINCT FROM 'responded'
      AND (
        (p_mode = 'pending' AND us.status IN ('not_shown', 'shown', 'opened'))
        OR (p_mode = 'dismissed' AND us.status = 'dismissed')
        OR (p_mode = 'never_opened' AND us.status IN ('not_shown', 'shown') AND us.opened_at IS NULL)
      )
  )
  UPDATE public.communication_user_states us
  SET
    status = 'not_shown',
    shown_at = NULL,
    opened_at = NULL,
    dismissed_at = NULL,
    last_resent_at = NOW(),
    updated_at = NOW()
  FROM eligible e
  WHERE us.id = e.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
  VALUES (
    p_campaign_id,
    auth.uid(),
    'resent',
    jsonb_build_object('mode', p_mode, 'count', v_updated, 'interval_days', p_interval_days)
  );

  RETURN jsonb_build_object('updated', v_updated, 'mode', p_mode);
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

  -- Expire out-of-window states for this user.
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
      AND public.communication_audience_matches(c.audience, v_role, FALSE)
      AND COALESCE(us.status, 'not_shown') IS DISTINCT FROM 'responded'
      AND COALESCE(us.status, 'not_shown') IS DISTINCT FROM 'expired'
      AND (
        -- Never shown (or reset by resend)
        us.id IS NULL
        OR us.status = 'not_shown'
        -- Still in progress (including once until the user acts)
        OR (
          us.status IN ('shown', 'opened')
          AND c.behavior IN ('once', 'until_respond', 'until_dismiss', 'always')
        )
        -- always: reappear after dismiss
        OR (us.status = 'dismissed' AND c.behavior = 'always')
        -- interval-based reshow after dismiss
        OR (
          us.status = 'dismissed'
          AND c.resend_interval_days IS NOT NULL
          AND us.dismissed_at IS NOT NULL
          AND us.dismissed_at <= NOW() - make_interval(days => c.resend_interval_days)
        )
      )
  ) q;

  RETURN v_result;
END;
$$;

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

  IF v_state.status = 'responded' THEN
    RETURN to_jsonb(v_state);
  END IF;

  v_next := v_state.status;

  IF p_event_type = 'shown' THEN
    v_next := CASE WHEN v_state.status = 'not_shown' THEN 'shown' ELSE v_state.status END;
    UPDATE public.communication_user_states
    SET
      status = v_next,
      shown_at = COALESCE(shown_at, NOW()),
      updated_at = NOW()
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
    -- CTA clicks mark opened; do not dismiss
    UPDATE public.communication_user_states
    SET
      status = CASE WHEN status IN ('responded', 'dismissed') THEN status ELSE 'opened' END,
      shown_at = COALESCE(shown_at, NOW()),
      opened_at = COALESCE(opened_at, NOW()),
      updated_at = NOW()
    WHERE id = v_state.id
    RETURNING * INTO v_state;
  END IF;

  INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
  VALUES (p_campaign_id, v_uid, p_event_type, COALESCE(p_meta, '{}'::jsonb));

  RETURN to_jsonb(v_state);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_communication_response(
  p_campaign_id UUID,
  p_rating INT DEFAULT NULL,
  p_improvement_text TEXT DEFAULT NULL,
  p_comment_text TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL,
  p_account_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_response public.communication_responses%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 10) THEN
    RAISE EXCEPTION 'rating must be between 1 and 10';
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_uid LIMIT 1;

  INSERT INTO public.communication_responses (
    campaign_id, user_id, rating, improvement_text, comment_text, app_version, account_type
  ) VALUES (
    p_campaign_id,
    v_uid,
    p_rating,
    NULLIF(trim(COALESCE(p_improvement_text, '')), ''),
    NULLIF(trim(COALESCE(p_comment_text, '')), ''),
    NULLIF(trim(COALESCE(p_app_version, '')), ''),
    COALESCE(NULLIF(trim(COALESCE(p_account_type, '')), ''), v_role)
  )
  ON CONFLICT (campaign_id, user_id) DO UPDATE
  SET
    rating = EXCLUDED.rating,
    improvement_text = EXCLUDED.improvement_text,
    comment_text = EXCLUDED.comment_text,
    app_version = COALESCE(EXCLUDED.app_version, communication_responses.app_version),
    account_type = COALESCE(EXCLUDED.account_type, communication_responses.account_type)
  RETURNING * INTO v_response;

  INSERT INTO public.communication_user_states (campaign_id, user_id, status, shown_at, opened_at, responded_at)
  VALUES (p_campaign_id, v_uid, 'responded', NOW(), NOW(), NOW())
  ON CONFLICT (campaign_id, user_id) DO UPDATE
  SET
    status = 'responded',
    shown_at = COALESCE(communication_user_states.shown_at, NOW()),
    opened_at = COALESCE(communication_user_states.opened_at, NOW()),
    responded_at = NOW(),
    updated_at = NOW();

  INSERT INTO public.communication_events (campaign_id, user_id, event_type, meta)
  VALUES (
    p_campaign_id,
    v_uid,
    'responded',
    jsonb_build_object('rating', p_rating)
  );

  RETURN to_jsonb(v_response);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_communication_campaigns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_communication_campaign(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_communication_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_communication_campaign_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_communication_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_communication_campaign_stats(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resend_communication_campaign(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_communications_for_me() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_communication_event(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_communication_response(UUID, INT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
