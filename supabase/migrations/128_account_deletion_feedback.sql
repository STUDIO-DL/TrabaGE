-- =============================================
-- 128_account_deletion_feedback.sql
-- Exit survey + retention analytics for account
-- deletion. Snapshot survives auth.users hard delete.
-- =============================================

CREATE TABLE IF NOT EXISTS public.account_deletion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_code TEXT NOT NULL,
  reason_other TEXT,
  rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
  improvement_comment TEXT,
  account_type TEXT NOT NULL
    CHECK (account_type IN ('personal', 'business', 'organization', 'admin', 'unknown')),
  country TEXT,
  city TEXT,
  registered_at TIMESTAMPTZ,
  account_age_days INTEGER,
  posts_count INTEGER NOT NULL DEFAULT 0,
  applications_count INTEGER NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT account_deletion_feedback_reason_other_len
    CHECK (reason_other IS NULL OR char_length(reason_other) <= 500),
  CONSTRAINT account_deletion_feedback_improvement_len
    CHECK (improvement_comment IS NULL OR char_length(improvement_comment) <= 500)
);

CREATE INDEX IF NOT EXISTS account_deletion_feedback_deleted_at_idx
  ON public.account_deletion_feedback (deleted_at DESC);

CREATE INDEX IF NOT EXISTS account_deletion_feedback_reason_idx
  ON public.account_deletion_feedback (reason_code);

CREATE INDEX IF NOT EXISTS account_deletion_feedback_account_type_idx
  ON public.account_deletion_feedback (account_type);

CREATE INDEX IF NOT EXISTS account_deletion_feedback_country_idx
  ON public.account_deletion_feedback (country);

ALTER TABLE public.account_deletion_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct select account deletion feedback"
  ON public.account_deletion_feedback;
CREATE POLICY "No direct select account deletion feedback"
  ON public.account_deletion_feedback
  FOR SELECT TO authenticated
  USING (FALSE);

DROP POLICY IF EXISTS "No direct insert account deletion feedback"
  ON public.account_deletion_feedback;
CREATE POLICY "No direct insert account deletion feedback"
  ON public.account_deletion_feedback
  FOR INSERT TO authenticated
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "No direct update account deletion feedback"
  ON public.account_deletion_feedback;
CREATE POLICY "No direct update account deletion feedback"
  ON public.account_deletion_feedback
  FOR UPDATE TO authenticated
  USING (FALSE);

DROP POLICY IF EXISTS "No direct delete account deletion feedback"
  ON public.account_deletion_feedback;
CREATE POLICY "No direct delete account deletion feedback"
  ON public.account_deletion_feedback
  FOR DELETE TO authenticated
  USING (FALSE);

REVOKE ALL ON public.account_deletion_feedback FROM PUBLIC;
GRANT SELECT ON public.account_deletion_feedback TO service_role;

COMMENT ON TABLE public.account_deletion_feedback IS
  'Anonymous retention snapshots captured at self-serve account deletion. Admin-only via RPCs.';

-- ─── delete_own_account: capture feedback + stats BEFORE auth.users delete ─

DROP FUNCTION IF EXISTS public.delete_own_account();
DROP FUNCTION IF EXISTS public.delete_own_account(boolean);
DROP FUNCTION IF EXISTS public.delete_own_account(boolean, text, text, integer, text);

CREATE OR REPLACE FUNCTION public.delete_own_account(
  p_send_goodbye boolean DEFAULT true,
  p_reason_code text DEFAULT NULL,
  p_reason_other text DEFAULT NULL,
  p_rating integer DEFAULT NULL,
  p_improvement_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_role text;
  v_account_type text;
  v_token uuid;
  v_country text;
  v_city text;
  v_registered_at timestamptz;
  v_posts_count integer := 0;
  v_applications_count integer := 0;
  v_followers_count integer := 0;
  v_reason text;
  v_reason_other text;
  v_improvement text;
  v_rating integer;
  v_profile_created timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT btrim(u.email), u.created_at
  INTO v_email, v_registered_at
  FROM auth.users u
  WHERE u.id = v_uid;

  SELECT lower(btrim(r.role)) INTO v_role
  FROM public.user_roles r
  WHERE r.user_id = v_uid;

  v_account_type := CASE
    WHEN v_role IN ('organization') THEN 'organization'
    WHEN v_role IN ('business', 'company') THEN 'business'
    WHEN v_role IN ('personal', 'candidate') THEN 'personal'
    WHEN v_role = 'admin' THEN 'admin'
    ELSE 'unknown'
  END;

  IF v_account_type IN ('personal') THEN
    SELECT
      NULLIF(btrim(cp.country), ''),
      NULLIF(btrim(cp.city), ''),
      cp.created_at
    INTO v_country, v_city, v_profile_created
    FROM public.candidate_profiles cp
    WHERE cp.user_id = v_uid;

    IF v_profile_created IS NOT NULL THEN
      v_registered_at := v_profile_created;
    END IF;

    SELECT COUNT(*)::integer INTO v_applications_count
    FROM public.applications a
    WHERE a.candidate_id = v_uid;
  ELSIF v_account_type IN ('business', 'organization') THEN
    SELECT
      NULLIF(btrim(co.country), ''),
      NULLIF(btrim(co.city), ''),
      co.created_at
    INTO v_country, v_city, v_profile_created
    FROM public.company_profiles co
    WHERE co.user_id = v_uid;

    IF v_profile_created IS NOT NULL THEN
      v_registered_at := v_profile_created;
    END IF;

    SELECT COUNT(*)::integer INTO v_applications_count
    FROM public.applications a
    INNER JOIN public.jobs j ON j.id = a.job_id
    WHERE j.company_id = v_uid;
  END IF;

  SELECT COUNT(*)::integer INTO v_posts_count
  FROM public.posts p
  WHERE p.author_id = v_uid;

  SELECT COUNT(*)::integer INTO v_followers_count
  FROM public.follows f
  WHERE f.target_id = v_uid;

  v_reason := NULLIF(lower(btrim(COALESCE(p_reason_code, ''))), '');
  v_reason_other := NULLIF(left(btrim(COALESCE(p_reason_other, '')), 500), '');
  v_improvement := NULLIF(left(btrim(COALESCE(p_improvement_comment, '')), 500), '');
  v_rating := CASE
    WHEN p_rating IS NULL THEN NULL
    WHEN p_rating BETWEEN 1 AND 10 THEN p_rating
    ELSE NULL
  END;

  -- Only persist a survey row when the user provided a reason (self-serve exit flow).
  -- OAuth orphan cleanup / silent deletes skip this.
  IF v_reason IS NOT NULL THEN
    INSERT INTO public.account_deletion_feedback (
      reason_code,
      reason_other,
      rating,
      improvement_comment,
      account_type,
      country,
      city,
      registered_at,
      account_age_days,
      posts_count,
      applications_count,
      followers_count,
      deleted_at
    ) VALUES (
      v_reason,
      CASE WHEN v_reason = 'other' THEN v_reason_other ELSE NULL END,
      v_rating,
      v_improvement,
      v_account_type,
      v_country,
      v_city,
      v_registered_at,
      CASE
        WHEN v_registered_at IS NULL THEN NULL
        ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - v_registered_at)) / 86400)::integer)
      END,
      COALESCE(v_posts_count, 0),
      COALESCE(v_applications_count, 0),
      COALESCE(v_followers_count, 0),
      NOW()
    );
  END IF;

  IF coalesce(p_send_goodbye, true)
     AND v_email IS NOT NULL
     AND v_email <> ''
     AND v_role IS NOT NULL
     AND v_role <> 'admin'
     AND v_account_type IN ('personal', 'business', 'organization') THEN
    v_token := gen_random_uuid();

    INSERT INTO public.account_goodbye_email_outbox (
      email,
      account_type,
      send_token,
      status
    ) VALUES (
      v_email,
      v_account_type,
      v_token,
      'pending'
    );
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;

  IF v_token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'goodbye_token', v_token,
      'account_type', v_account_type
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account(boolean, text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account(boolean, text, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.delete_own_account(true, NULL, NULL, NULL, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account(boolean, text, text, integer, text) IS
  'Deletes the authenticated user. Optionally records exit-survey feedback + retention snapshot before delete. Queues farewell email unless p_send_goodbye=false.';

-- ─── Admin: list deleted-account feedback ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_list_deleted_accounts()
RETURNS TABLE (
  id UUID,
  reason_code TEXT,
  reason_other TEXT,
  rating SMALLINT,
  improvement_comment TEXT,
  account_type TEXT,
  country TEXT,
  city TEXT,
  registered_at TIMESTAMPTZ,
  account_age_days INTEGER,
  posts_count INTEGER,
  applications_count INTEGER,
  followers_count INTEGER,
  deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  RETURN QUERY
  SELECT
    f.id,
    f.reason_code,
    f.reason_other,
    f.rating,
    f.improvement_comment,
    f.account_type,
    f.country,
    f.city,
    f.registered_at,
    f.account_age_days,
    f.posts_count,
    f.applications_count,
    f.followers_count,
    f.deleted_at
  FROM public.account_deletion_feedback f
  ORDER BY f.deleted_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_deleted_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_deleted_accounts() TO authenticated;

-- ─── Admin: aggregate retention stats ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_deleted_accounts_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total integer;
  v_avg_rating numeric;
BEGIN
  PERFORM public.require_admin();

  SELECT COUNT(*)::integer, ROUND(AVG(f.rating)::numeric, 1)
  INTO v_total, v_avg_rating
  FROM public.account_deletion_feedback f;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'avg_rating', v_avg_rating,
    'by_reason', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('code', x.reason_code, 'count', x.cnt)
        ORDER BY x.cnt DESC
      )
      FROM (
        SELECT f.reason_code, COUNT(*)::integer AS cnt
        FROM public.account_deletion_feedback f
        GROUP BY f.reason_code
      ) x
    ), '[]'::jsonb),
    'by_month', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('month', x.month, 'count', x.cnt)
        ORDER BY x.month DESC
      )
      FROM (
        SELECT to_char(date_trunc('month', f.deleted_at), 'YYYY-MM') AS month,
               COUNT(*)::integer AS cnt
        FROM public.account_deletion_feedback f
        GROUP BY date_trunc('month', f.deleted_at)
      ) x
    ), '[]'::jsonb),
    'by_country', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('country', x.country, 'count', x.cnt)
        ORDER BY x.cnt DESC
      )
      FROM (
        SELECT COALESCE(NULLIF(btrim(f.country), ''), 'Sin país') AS country,
               COUNT(*)::integer AS cnt
        FROM public.account_deletion_feedback f
        GROUP BY COALESCE(NULLIF(btrim(f.country), ''), 'Sin país')
      ) x
    ), '[]'::jsonb),
    'by_account_type', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('account_type', x.account_type, 'count', x.cnt)
        ORDER BY x.cnt DESC
      )
      FROM (
        SELECT f.account_type, COUNT(*)::integer AS cnt
        FROM public.account_deletion_feedback f
        GROUP BY f.account_type
      ) x
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_deleted_accounts_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_deleted_accounts_stats() TO authenticated;

NOTIFY pgrst, 'reload schema';
