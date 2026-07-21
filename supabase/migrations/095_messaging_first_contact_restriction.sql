-- =============================================
-- 095_messaging_first_contact_restriction.sql
-- TikTok-style first-contact rule: one message until the other participant replies.
-- =============================================

-- ─── 1. Permission helper ────────────────────────────────────────────────────

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
    AND m.sender_id = p_user_id;

  IF v_my_count = 0 THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*)::BIGINT
  INTO v_other_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id <> p_user_id;

  RETURN v_other_count >= 1;
END;
$$;

REVOKE ALL ON FUNCTION public.can_user_send_message(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_send_message(UUID, UUID) TO authenticated, service_role;

-- ─── 2. BEFORE INSERT enforcement ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_message_first_contact_rule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.can_user_send_message(NEW.conversation_id, NEW.sender_id) THEN
    RAISE EXCEPTION
      'Debes esperar a que esta persona responda antes de enviar otro mensaje.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_enforce_first_contact ON public.messages;

CREATE TRIGGER messages_enforce_first_contact
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_first_contact_rule();

-- ─── 3. RPC for frontend send state ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_conversation_send_state(p_conversation_id UUID)
RETURNS TABLE (
  can_send BOOLEAN,
  blocked_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_allowed BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'Not a conversation participant';
  END IF;

  v_allowed := public.can_user_send_message(p_conversation_id, v_uid);

  RETURN QUERY
  SELECT
    v_allowed,
    CASE
      WHEN v_allowed THEN NULL::TEXT
      ELSE 'Debes esperar a que esta persona responda antes de enviar otro mensaje.'::TEXT
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_send_state(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversation_send_state(UUID) TO authenticated;
