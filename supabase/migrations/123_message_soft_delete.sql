-- =============================================
-- 123_message_soft_delete.sql
-- Soft-delete own messages (WhatsApp-like). Participants still see the thread
-- without the deleted row; reply previews show "ya no disponible".
-- =============================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_active_created_idx
  ON public.messages (conversation_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

-- ─── Soft-delete own message (sender only) ───────────────────────────────────

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

  IF NOT FOUND THEN
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

REVOKE ALL ON FUNCTION public.soft_delete_own_message(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_own_message(UUID) TO authenticated;

COMMENT ON FUNCTION public.soft_delete_own_message(UUID) IS
  'Marks a message as deleted by its sender. Does not hard-delete; preserves reply refs.';

-- ─── Conversation list: skip deleted messages for preview / unread ──────────

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
    WHERE m.deleted_at IS NULL
    ORDER BY m.conversation_id, m.created_at DESC, m.id DESC
  ),
  unread AS (
    SELECT m.conversation_id, COUNT(*)::BIGINT AS unread_count
    FROM public.messages m
    JOIN my_conversations mc ON mc.conversation_id = m.conversation_id
    WHERE m.sender_id <> coalesce(p_user_id, auth.uid())
      AND m.deleted_at IS NULL
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

-- Unread badge: ignore soft-deleted
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
    AND m.deleted_at IS NULL
    AND m.created_at > coalesce(me.last_read_at, '-infinity'::timestamptz);
$$;

-- Search in conversation: skip soft-deleted
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
    AND m.deleted_at IS NULL
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

