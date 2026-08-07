-- =============================================
-- 137_preserve_first_contact_after_soft_delete.sql
-- Keep sender-side deletion from resetting the one-message first-contact gate.
-- Message expiry remains the boundary for starting a new contact attempt.
-- =============================================

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

  -- Soft-delete controls visibility only. A deleted message must still count as
  -- the sender's first-contact attempt until its platform TTL expires.
  SELECT COUNT(*)::BIGINT
  INTO v_my_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id = p_user_id
    AND m.expires_at > now();

  IF v_my_count = 0 THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*)::BIGINT
  INTO v_other_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id <> p_user_id
    AND m.expires_at > now();

  RETURN v_other_count >= 1;
END;
$$;

REVOKE ALL ON FUNCTION public.can_user_send_message(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_send_message(UUID, UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.can_user_send_message(UUID, UUID) IS
  'Allows one first-contact message until the other participant replies; soft-deleted messages still count until expiry.';

NOTIFY pgrst, 'reload schema';
