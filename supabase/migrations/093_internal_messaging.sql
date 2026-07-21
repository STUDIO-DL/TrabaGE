-- =============================================
-- 093_internal_messaging.sql
-- Internal 1-to-1 messaging MVP: conversations, participants, messages.
-- =============================================

-- ─── 1. Tables ───────────────────────────────────────────────────────────────

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX conversation_participants_user_id_idx
  ON public.conversation_participants (user_id);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT messages_content_max_length CHECK (char_length(content) <= 2000)
);

CREATE INDEX messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC, id DESC);

-- ─── 2. Helpers ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.role_path_prefix(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE lower(coalesce(ur.role, ''))
    WHEN 'personal' THEN '/personal'
    WHEN 'candidate' THEN '/personal'
    WHEN 'business' THEN '/business'
    WHEN 'company' THEN '/business'
    WHEN 'organization' THEN '/organization'
    WHEN 'institution' THEN '/organization'
    ELSE '/personal'
  END
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.role_path_prefix(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.role_path_prefix(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.messaging_display_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT cp.full_name INTO v_name
  FROM public.candidate_profiles cp
  WHERE cp.user_id = p_user_id
    AND coalesce(cp.is_active, true) = true
  LIMIT 1;

  IF v_name IS NOT NULL AND char_length(trim(v_name)) > 0 THEN
    RETURN trim(v_name);
  END IF;

  SELECT co.company_name INTO v_name
  FROM public.company_profiles co
  WHERE co.user_id = p_user_id
    AND coalesce(co.is_active, true) = true
  LIMIT 1;

  IF v_name IS NOT NULL AND char_length(trim(v_name)) > 0 THEN
    RETURN trim(v_name);
  END IF;

  RETURN 'Usuario';
END;
$$;

REVOKE ALL ON FUNCTION public.messaging_display_name(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.messaging_display_name(UUID) TO authenticated, service_role;

-- ─── 3. get_or_create_direct_conversation ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_conversation_id UUID;
  v_lock_key BIGINT;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_me THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  IF NOT public.is_public_app_user(p_other_user_id) THEN
    RAISE EXCEPTION 'Recipient not available';
  END IF;

  IF NOT public.is_public_app_user(v_me) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_lock_key := hashtext(concat(LEAST(v_me::TEXT, p_other_user_id::TEXT), ':', GREATEST(v_me::TEXT, p_other_user_id::TEXT)));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT cp.conversation_id
  INTO v_conversation_id
  FROM public.conversation_participants cp
  WHERE cp.user_id IN (v_me, p_other_user_id)
  GROUP BY cp.conversation_id
  HAVING COUNT(*) = 2
    AND COUNT(*) FILTER (WHERE cp.user_id = v_me) = 1
    AND COUNT(*) FILTER (WHERE cp.user_id = p_other_user_id) = 1
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, last_read_at)
  VALUES
    (v_conversation_id, v_me, now()),
    (v_conversation_id, p_other_user_id, 'epoch'::timestamptz);

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;

-- ─── 4. List conversations + unread count RPCs ──────────────────────────────

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
$$;

REVOKE ALL ON FUNCTION public.list_user_conversations(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_user_conversations(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_total_unread_messages_count(p_user_id UUID DEFAULT auth.uid())
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(COUNT(*)::BIGINT, 0)
  FROM public.messages m
  JOIN public.conversation_participants cp
    ON cp.conversation_id = m.conversation_id
   AND cp.user_id = p_user_id
  WHERE m.sender_id <> p_user_id
    AND m.created_at > cp.last_read_at;
$$;

REVOKE ALL ON FUNCTION public.get_total_unread_messages_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_total_unread_messages_count(UUID) TO authenticated;

-- ─── 5. Message notification trigger ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recipient_id UUID;
  v_recipient_last_read TIMESTAMPTZ;
  v_sender_name TEXT;
  v_link TEXT;
  v_preview TEXT;
  v_dedup_key TEXT;
BEGIN
  SELECT cp.user_id, cp.last_read_at
  INTO v_recipient_id, v_recipient_last_read
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id <> NEW.sender_id
  LIMIT 1;

  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_recipient_last_read IS NOT NULL AND v_recipient_last_read >= NEW.created_at THEN
    RETURN NEW;
  END IF;

  IF NOT public.user_allows_notification(v_recipient_id, 'new_message') THEN
    RETURN NEW;
  END IF;

  v_sender_name := public.messaging_display_name(NEW.sender_id);
  v_link := public.role_path_prefix(v_recipient_id) || '/messages/' || NEW.conversation_id::TEXT;
  v_preview := left(trim(NEW.content), 120);
  v_dedup_key := md5(concat_ws(':', v_recipient_id::TEXT, 'new_message', NEW.id::TEXT));

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
  VALUES (
    v_recipient_id,
    'new_message',
    'Nuevo mensaje de ' || v_sender_name,
    v_preview,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'link', v_link
    ),
    v_dedup_key
  )
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- ─── 6. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select_participant
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(id));

CREATE POLICY conversation_participants_select_participant
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY conversation_participants_update_own
  ON public.conversation_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.is_conversation_participant(conversation_id))
  WITH CHECK (user_id = auth.uid() AND public.is_conversation_participant(conversation_id));

CREATE POLICY messages_select_participant
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY messages_insert_participant
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id)
  );

-- ─── 7. Grants ───────────────────────────────────────────────────────────────

GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT, UPDATE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

-- ─── 8. Realtime ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
