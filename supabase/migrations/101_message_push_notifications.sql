-- Message push notifications: conversation presence + updated notify copy.

-- ─── 1. Active conversation presence ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversation_active_views (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_active_views_last_seen
  ON public.conversation_active_views (last_seen_at);

ALTER TABLE public.conversation_active_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_active_views_select_own
  ON public.conversation_active_views
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY conversation_active_views_insert_own
  ON public.conversation_active_views
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_conversation_participant(conversation_id)
  );

CREATE POLICY conversation_active_views_update_own
  ON public.conversation_active_views
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_conversation_participant(conversation_id)
  );

CREATE POLICY conversation_active_views_delete_own
  ON public.conversation_active_views
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── 2. Presence helpers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_viewing_conversation(
  p_user_id UUID,
  p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_active_views cav
    WHERE cav.user_id = p_user_id
      AND cav.conversation_id = p_conversation_id
      AND cav.last_seen_at > now() - interval '45 seconds'
  );
$$;

CREATE OR REPLACE FUNCTION public.upsert_conversation_active_view(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.conversation_active_views (user_id, conversation_id, last_seen_at)
  VALUES (auth.uid(), p_conversation_id, now())
  ON CONFLICT (user_id, conversation_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_conversation_active_view(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.conversation_active_views
  WHERE user_id = auth.uid()
    AND conversation_id = p_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_viewing_conversation(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_viewing_conversation(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.upsert_conversation_active_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_conversation_active_view(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.clear_conversation_active_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_conversation_active_view(UUID) TO authenticated;

-- ─── 3. Mark message notifications read when opening a chat ──────────────────

CREATE OR REPLACE FUNCTION public.mark_message_notifications_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_conversation_participant(p_conversation_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.notifications
  SET read = true
  WHERE recipient_id = auth.uid()
    AND type = 'new_message'
    AND read = false
    AND metadata->>'conversation_id' = p_conversation_id::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_message_notifications_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_message_notifications_read(UUID) TO authenticated;

-- ─── 4. Updated message notification trigger ───────────────────────────────

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
  v_body TEXT;
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

  IF public.is_viewing_conversation(v_recipient_id, NEW.conversation_id) THEN
    RETURN NEW;
  END IF;

  IF NOT public.user_allows_notification(v_recipient_id, 'new_message') THEN
    RETURN NEW;
  END IF;

  v_sender_name := public.messaging_display_name(NEW.sender_id);
  v_link := public.role_path_prefix(v_recipient_id) || '/messages/' || NEW.conversation_id::TEXT;
  v_preview := left(trim(NEW.content), 80);

  IF v_preview IS NOT NULL AND char_length(v_preview) > 0 THEN
    v_body := v_sender_name || ': ' || v_preview;
  ELSE
    v_body := v_sender_name || ' te ha enviado un mensaje.';
  END IF;

  v_dedup_key := md5(concat_ws(':', v_recipient_id::TEXT, 'new_message', NEW.id::TEXT));

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
  VALUES (
    v_recipient_id,
    'new_message',
    'Nuevo mensaje',
    v_body,
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
