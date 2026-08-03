-- =============================================
-- 129_message_ephemeral_ttl.sql
-- Platform-wide ephemeral messages: every chat
-- message expires 14 days after send. Hard purge
-- via scheduled batch job (no orphan rows).
-- Storage cleanup hook reserved for future media.
-- =============================================

-- ─── Column + backfill ──────────────────────────────────────────────────────

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.messages
SET expires_at = created_at + INTERVAL '14 days'
WHERE expires_at IS NULL;

ALTER TABLE public.messages
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '14 days'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS messages_expires_at_idx
  ON public.messages (expires_at ASC);

COMMENT ON COLUMN public.messages.expires_at IS
  'Hard-delete deadline. Fixed platform TTL: created_at + 14 days.';

-- ─── Always stamp TTL on insert (clients cannot extend) ─────────────────────

CREATE OR REPLACE FUNCTION public.set_message_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  NEW.expires_at := NEW.created_at + INTERVAL '14 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_set_expires_at ON public.messages;
CREATE TRIGGER messages_set_expires_at
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_expires_at();

-- ─── Visibility helper ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.message_is_active(
  p_deleted_at TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT p_deleted_at IS NULL
    AND p_expires_at IS NOT NULL
    AND p_expires_at > now();
$$;

COMMENT ON FUNCTION public.message_is_active(TIMESTAMPTZ, TIMESTAMPTZ) IS
  'True when a message is visible: not soft-deleted and not past expires_at.';

GRANT EXECUTE ON FUNCTION public.message_is_active(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

-- ─── RLS: hide soft-deleted + expired from direct client SELECT ─────────────

DROP POLICY IF EXISTS messages_select_participant ON public.messages;
CREATE POLICY messages_select_participant
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(conversation_id)
    AND public.message_is_active(deleted_at, expires_at)
  );

-- ─── First-contact rule: only active messages count ─────────────────────────

CREATE OR REPLACE FUNCTION public.can_user_send_message(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_my_count BIGINT;
  v_other_count BIGINT;
BEGIN
  IF p_conversation_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = p_user_id
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*)::BIGINT
  INTO v_my_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id = p_user_id
    AND public.message_is_active(m.deleted_at, m.expires_at);

  IF v_my_count = 0 THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*)::BIGINT
  INTO v_other_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id <> p_user_id
    AND public.message_is_active(m.deleted_at, m.expires_at);

  RETURN v_other_count >= 1;
END;
$$;

-- ─── Conversation list / unread ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_user_conversations(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  conversation_id UUID,
  created_at TIMESTAMPTZ,
  other_user_id UUID,
  other_last_read_at TIMESTAMPTZ,
  my_last_read_at TIMESTAMPTZ,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH my_conversations AS (
    SELECT cp.conversation_id, cp.last_read_at AS my_last_read_at, c.created_at
    FROM public.conversation_participants cp
    JOIN public.conversations c ON c.id = cp.conversation_id
    WHERE cp.user_id = coalesce(p_user_id, auth.uid())
  ),
  others AS (
    SELECT cp.conversation_id, cp.user_id AS other_user_id, cp.last_read_at AS other_last_read_at
    FROM public.conversation_participants cp
    JOIN my_conversations mc ON mc.conversation_id = cp.conversation_id
    WHERE cp.user_id <> coalesce(p_user_id, auth.uid())
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.id AS last_message_id,
      m.content AS last_message_content,
      m.sender_id AS last_message_sender_id,
      m.created_at AS last_message_created_at
    FROM public.messages m
    JOIN my_conversations mc ON mc.conversation_id = m.conversation_id
    WHERE public.message_is_active(m.deleted_at, m.expires_at)
    ORDER BY m.conversation_id, m.created_at DESC, m.id DESC
  ),
  unread AS (
    SELECT m.conversation_id, COUNT(*)::BIGINT AS unread_count
    FROM public.messages m
    JOIN my_conversations mc ON mc.conversation_id = m.conversation_id
    WHERE m.sender_id <> coalesce(p_user_id, auth.uid())
      AND public.message_is_active(m.deleted_at, m.expires_at)
      AND m.created_at > mc.my_last_read_at
    GROUP BY m.conversation_id
  )
  SELECT
    mc.conversation_id,
    mc.created_at,
    o.other_user_id,
    o.other_last_read_at,
    mc.my_last_read_at,
    lm.last_message_id,
    lm.last_message_content,
    lm.last_message_sender_id,
    lm.last_message_created_at,
    coalesce(u.unread_count, 0) AS unread_count
  FROM my_conversations mc
  JOIN others o ON o.conversation_id = mc.conversation_id
  LEFT JOIN last_messages lm ON lm.conversation_id = mc.conversation_id
  LEFT JOIN unread u ON u.conversation_id = mc.conversation_id
  ORDER BY coalesce(lm.last_message_created_at, mc.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_total_unread_messages_count(p_user_id UUID DEFAULT auth.uid())
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::BIGINT
  FROM public.messages m
  JOIN public.conversation_participants me
    ON me.conversation_id = m.conversation_id
   AND me.user_id = coalesce(p_user_id, auth.uid())
  WHERE m.sender_id <> coalesce(p_user_id, auth.uid())
    AND public.message_is_active(m.deleted_at, m.expires_at)
    AND m.created_at > coalesce(me.last_read_at, '-infinity'::timestamptz);
$$;

-- ─── Search: conversations + in-thread ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_user_conversations(
  p_query text,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  conversation_id UUID,
  created_at TIMESTAMPTZ,
  other_user_id UUID,
  other_last_read_at TIMESTAMPTZ,
  my_last_read_at TIMESTAMPTZ,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm text := public.normalize_search_text(p_query);
  v_limit int := GREATEST(1, LEAST(coalesce(p_limit, 20), 50));
  v_offset int := GREATEST(0, coalesce(p_offset, 0));
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF v_norm IS NULL OR length(v_norm) < 1 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_conversations AS (
    SELECT cp.conversation_id, cp.last_read_at AS my_last_read_at, c.created_at
    FROM public.conversation_participants cp
    JOIN public.conversations c ON c.id = cp.conversation_id
    WHERE cp.user_id = v_uid
  ),
  others AS (
    SELECT cp.conversation_id, cp.user_id AS other_user_id, cp.last_read_at AS other_last_read_at
    FROM public.conversation_participants cp
    JOIN my_conversations mc ON mc.conversation_id = cp.conversation_id
    WHERE cp.user_id <> v_uid
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.id AS last_message_id,
      m.content AS last_message_content,
      m.sender_id AS last_message_sender_id,
      m.created_at AS last_message_created_at
    FROM public.messages m
    JOIN my_conversations mc ON mc.conversation_id = m.conversation_id
    WHERE public.message_is_active(m.deleted_at, m.expires_at)
    ORDER BY m.conversation_id, m.created_at DESC, m.id DESC
  ),
  unread AS (
    SELECT m.conversation_id, COUNT(*)::BIGINT AS unread_count
    FROM public.messages m
    JOIN my_conversations mc ON mc.conversation_id = m.conversation_id
    WHERE m.sender_id <> v_uid
      AND public.message_is_active(m.deleted_at, m.expires_at)
      AND m.created_at > mc.my_last_read_at
    GROUP BY m.conversation_id
  ),
  named AS (
    SELECT
      o.conversation_id,
      o.other_user_id,
      o.other_last_read_at,
      coalesce(
        nullif(trim(cand.full_name), ''),
        nullif(trim(co.company_name), ''),
        ''
      ) AS display_name
    FROM others o
    LEFT JOIN public.candidate_profiles cand ON cand.user_id = o.other_user_id
    LEFT JOIN public.company_profiles co ON co.user_id = o.other_user_id
  )
  SELECT
    mc.conversation_id,
    mc.created_at,
    n.other_user_id,
    n.other_last_read_at,
    mc.my_last_read_at,
    lm.last_message_id,
    lm.last_message_content,
    lm.last_message_sender_id,
    lm.last_message_created_at,
    coalesce(u.unread_count, 0) AS unread_count
  FROM my_conversations mc
  JOIN named n ON n.conversation_id = mc.conversation_id
  LEFT JOIN last_messages lm ON lm.conversation_id = mc.conversation_id
  LEFT JOIN unread u ON u.conversation_id = mc.conversation_id
  WHERE public.f_unaccent(n.display_name) ILIKE '%' || v_norm || '%'
     OR public.f_unaccent(coalesce(lm.last_message_content, '')) ILIKE '%' || v_norm || '%'
  ORDER BY coalesce(lm.last_message_created_at, mc.created_at) DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_conversation_messages(
  p_conversation_id UUID,
  p_query text,
  p_limit int DEFAULT 20,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  snippet TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm text := public.normalize_search_text(p_query);
  v_limit int := GREATEST(1, LEAST(coalesce(p_limit, 20), 50));
BEGIN
  IF v_uid IS NULL OR p_conversation_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = v_uid
  ) THEN
    RETURN;
  END IF;

  IF v_norm IS NULL OR length(v_norm) < 1 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.created_at,
    CASE
      WHEN char_length(m.content) <= 140 THEN m.content
      ELSE left(m.content, 137) || '…'
    END AS snippet
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND public.message_is_active(m.deleted_at, m.expires_at)
    AND public.f_unaccent(m.content) ILIKE '%' || v_norm || '%'
    AND (
      p_before_created_at IS NULL
      OR m.created_at < p_before_created_at
      OR (m.created_at = p_before_created_at AND p_before_id IS NOT NULL AND m.id < p_before_id)
    )
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT v_limit;
END;
$$;

-- ─── Jump-to-message: ignore expired / soft-deleted anchors ─────────────────

CREATE OR REPLACE FUNCTION public.get_conversation_messages_around(
  p_conversation_id UUID,
  p_message_id UUID,
  p_before int DEFAULT 20,
  p_after int DEFAULT 10
)
RETURNS SETOF public.messages
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_anchor public.messages%ROWTYPE;
  v_before int := GREATEST(0, LEAST(coalesce(p_before, 20), 50));
  v_after int := GREATEST(0, LEAST(coalesce(p_after, 10), 50));
BEGIN
  IF v_uid IS NULL OR p_conversation_id IS NULL OR p_message_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = v_uid
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_anchor
  FROM public.messages m
  WHERE m.id = p_message_id
    AND m.conversation_id = p_conversation_id
    AND public.message_is_active(m.deleted_at, m.expires_at);

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  (
    SELECT m.*
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND public.message_is_active(m.deleted_at, m.expires_at)
      AND (
        m.created_at < v_anchor.created_at
        OR (m.created_at = v_anchor.created_at AND m.id < v_anchor.id)
      )
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT v_before
  )
  UNION ALL
  SELECT v_anchor.*
  UNION ALL
  (
    SELECT m.*
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND public.message_is_active(m.deleted_at, m.expires_at)
      AND (
        m.created_at > v_anchor.created_at
        OR (m.created_at = v_anchor.created_at AND m.id > v_anchor.id)
      )
    ORDER BY m.created_at ASC, m.id ASC
    LIMIT v_after
  );
END;
$$;

-- Soft-delete: reject already-expired messages
CREATE OR REPLACE FUNCTION public.soft_delete_own_message(p_message_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.messages%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_message_id IS NULL THEN
    RAISE EXCEPTION 'Mensaje no válido.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.messages m
  WHERE m.id = p_message_id
  FOR UPDATE;

  IF NOT FOUND OR v_row.expires_at <= now() THEN
    RAISE EXCEPTION 'Este mensaje ya no está disponible.';
  END IF;

  IF v_row.sender_id <> v_uid THEN
    RAISE EXCEPTION 'Solo puedes eliminar tus propios mensajes.';
  END IF;

  IF NOT public.is_conversation_participant(v_row.conversation_id) THEN
    RAISE EXCEPTION 'No tienes acceso a esta conversación.';
  END IF;

  IF v_row.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_row.id, 'deleted_at', v_row.deleted_at);
  END IF;

  UPDATE public.messages
  SET deleted_at = now()
  WHERE id = p_message_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'conversation_id', v_row.conversation_id,
    'deleted_at', v_row.deleted_at
  );
END;
$$;

-- ─── Storage cleanup hook (no message media today) ──────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_expired_message_storage(p_message_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Reserved for future image/document/audio Storage deletes.
  -- When attachments are added, delete objects here before hard-deleting rows.
  IF p_message_ids IS NULL OR cardinality(p_message_ids) = 0 THEN
    RETURN;
  END IF;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_message_storage(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_message_storage(UUID[]) TO service_role;

-- ─── Batch hard purge ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purge_expired_messages(p_limit INT DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids UUID[];
  v_deleted INT := 0;
  v_limit INT := GREATEST(1, LEAST(coalesce(p_limit, 500), 2000));
BEGIN
  WITH doomed AS (
    SELECT m.id
    FROM public.messages m
    WHERE m.expires_at <= now()
    ORDER BY m.expires_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  SELECT coalesce(array_agg(id), '{}'::uuid[])
  INTO v_ids
  FROM doomed;

  IF cardinality(v_ids) = 0 THEN
    RETURN jsonb_build_object('deleted', 0);
  END IF;

  PERFORM public.cleanup_expired_message_storage(v_ids);

  -- Mark related push/in-app notifications so clients can show a calm empty state.
  UPDATE public.notifications n
  SET metadata = coalesce(n.metadata, '{}'::jsonb) || jsonb_build_object('message_expired', true)
  WHERE n.type = 'new_message'
    AND n.metadata ? 'message_id'
    AND (n.metadata->>'message_id') ~* '^[0-9a-f-]{36}$'
    AND (n.metadata->>'message_id')::uuid = ANY(v_ids);

  DELETE FROM public.messages m
  WHERE m.id = ANY(v_ids);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('deleted', v_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_messages(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_messages(INT) TO service_role;

COMMENT ON FUNCTION public.purge_expired_messages(INT) IS
  'Hard-deletes expired messages in batches. Runs via pg_cron; cleans Storage via hook.';

-- Hourly purge (SQL-only, same pattern as communication automations)
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
    WHERE jobname = 'trabage_purge_expired_messages';

    PERFORM cron.schedule(
      'trabage_purge_expired_messages',
      '15 * * * *',
      $cron$ SELECT public.purge_expired_messages(500); $cron$
    );
    RAISE NOTICE 'Scheduled trabage_purge_expired_messages hourly at :15';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule message TTL cron: %', SQLERRM;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';
