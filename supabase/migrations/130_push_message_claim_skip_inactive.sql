-- =============================================
-- 130_push_message_claim_skip_inactive.sql
-- Do not backup-push soft-deleted or TTL-expired messages.
-- =============================================

CREATE OR REPLACE FUNCTION public.claim_pending_message_pushes(
  p_limit INT DEFAULT 40,
  p_lookback_minutes INT DEFAULT 10
)
RETURNS TABLE (
  notification_id UUID,
  recipient_id UUID,
  title TEXT,
  body TEXT,
  metadata JSONB,
  message_id TEXT,
  conversation_id TEXT,
  link TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id AS notification_id,
    n.recipient_id,
    n.title,
    n.body,
    n.metadata,
    n.metadata->>'message_id' AS message_id,
    n.metadata->>'conversation_id' AS conversation_id,
    n.metadata->>'link' AS link
  FROM public.notifications n
  WHERE n.type = 'new_message'
    AND n.created_at >= NOW() - make_interval(mins => GREATEST(COALESCE(p_lookback_minutes, 10), 1))
    AND COALESCE(n.metadata->>'message_id', '') ~* '^[0-9a-f-]{36}$'
    AND EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id::text = n.metadata->>'message_id'
        AND public.message_is_active(m.deleted_at, m.expires_at)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.push_send_log p
      WHERE p.dedup_key = concat_ws(':', 'new_message', n.recipient_id::TEXT, n.metadata->>'message_id')
        AND p.status = 'sent'
    )
  ORDER BY n.created_at ASC
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 40), 100), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_message_pushes(INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_message_pushes(INT, INT) TO service_role;

COMMENT ON FUNCTION public.claim_pending_message_pushes(INT, INT) IS
  'Claims recent new_message notifications lacking a successful push_send_log. Skips soft-deleted and TTL-expired messages.';

NOTIFY pgrst, 'reload schema';
