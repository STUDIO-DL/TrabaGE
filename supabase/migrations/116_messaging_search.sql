-- =============================================
-- 116_messaging_search.sql
-- Server-side conversation + in-thread message search.
-- Accent/case insensitive via normalize_search_text + pg_trgm.
-- Scoped to auth.uid() participants only (SECURITY DEFINER + explicit checks).
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Trigram index for partial / accent-insensitive message body search
CREATE INDEX IF NOT EXISTS messages_content_unaccent_trgm_idx
  ON public.messages
  USING gin (public.f_unaccent(content) extensions.gin_trgm_ops);

-- ─── Search conversations the current user belongs to ─────────────────────────
-- Matches: other participant name (candidate / company / org) + last message body.
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
    ORDER BY m.conversation_id, m.created_at DESC, m.id DESC
  ),
  unread AS (
    SELECT m.conversation_id, COUNT(*)::BIGINT AS unread_count
    FROM public.messages m
    JOIN my_conversations mc ON mc.conversation_id = m.conversation_id
    WHERE m.sender_id <> v_uid
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
  WHERE
    public.f_unaccent(n.display_name) ILIKE '%' || v_norm || '%'
    OR public.f_unaccent(coalesce(lm.last_message_content, '')) ILIKE '%' || v_norm || '%'
  ORDER BY coalesce(lm.last_message_created_at, mc.created_at) DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.search_user_conversations(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_user_conversations(text, int, int) TO authenticated;

-- ─── Search messages inside one conversation (participant-only) ───────────────
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

REVOKE ALL ON FUNCTION public.search_conversation_messages(UUID, text, int, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_conversation_messages(UUID, text, int, TIMESTAMPTZ, UUID) TO authenticated;

-- ─── Load a window of messages around an anchor (for jump-to-result) ──────────
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
    AND m.conversation_id = p_conversation_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  (
    SELECT m.*
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
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
      AND (
        m.created_at > v_anchor.created_at
        OR (m.created_at = v_anchor.created_at AND m.id > v_anchor.id)
      )
    ORDER BY m.created_at ASC, m.id ASC
    LIMIT v_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_messages_around(UUID, UUID, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages_around(UUID, UUID, int, int) TO authenticated;
