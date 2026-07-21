-- Prevent authenticated callers from reading another user's inbox through
-- SECURITY DEFINER messaging RPCs.

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH my_conversations AS (
    SELECT cp.conversation_id, cp.last_read_at AS my_last_read_at, c.created_at
    FROM public.conversation_participants cp
    JOIN public.conversations c ON c.id = cp.conversation_id
    WHERE cp.user_id = p_user_id
  ),
  others AS (
    SELECT cp.conversation_id, cp.user_id AS other_user_id, cp.last_read_at AS other_last_read_at
    FROM public.conversation_participants cp
    JOIN my_conversations mc ON mc.conversation_id = cp.conversation_id
    WHERE cp.user_id <> p_user_id
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
    WHERE m.sender_id <> p_user_id
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
END;
$$;

REVOKE ALL ON FUNCTION public.list_user_conversations(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_user_conversations(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_total_unread_messages_count(p_user_id UUID DEFAULT auth.uid())
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- send_push computes recipient badges with the service role; authenticated
  -- clients may only request their own count.
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND (auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(COUNT(*)::BIGINT, 0)
  INTO v_count
  FROM public.messages m
  JOIN public.conversation_participants cp
    ON cp.conversation_id = m.conversation_id
   AND cp.user_id = p_user_id
  WHERE m.sender_id <> p_user_id
    AND m.created_at > cp.last_read_at;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_total_unread_messages_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_total_unread_messages_count(UUID) TO authenticated, service_role;
