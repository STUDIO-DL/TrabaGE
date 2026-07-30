-- Message replies: link a message to the message it answers.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
  REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_message_id
  ON public.messages (reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_message_reply_same_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent_conversation UUID;
BEGIN
  IF NEW.reply_to_message_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.reply_to_message_id = NEW.id THEN
    RAISE EXCEPTION 'No puedes responder a un mensaje consigo mismo.';
  END IF;

  SELECT m.conversation_id
  INTO v_parent_conversation
  FROM public.messages m
  WHERE m.id = NEW.reply_to_message_id;

  IF v_parent_conversation IS NULL THEN
    RAISE EXCEPTION 'El mensaje al que intentas responder ya no está disponible.';
  END IF;

  IF v_parent_conversation <> NEW.conversation_id THEN
    RAISE EXCEPTION 'Solo puedes responder a mensajes de esta conversación.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_enforce_reply_same_conversation ON public.messages;
CREATE TRIGGER messages_enforce_reply_same_conversation
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_reply_same_conversation();

-- Softer push/in-app copy when the message is a reply (no full private content).
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
  v_title TEXT;
  v_preview TEXT;
  v_dedup_key TEXT;
  v_is_reply BOOLEAN;
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
  v_is_reply := NEW.reply_to_message_id IS NOT NULL;

  IF v_is_reply THEN
    v_title := v_sender_name || ' ha respondido a tu mensaje';
    v_body := 'Tienes una nueva respuesta en TrabaGE.';
  ELSE
    v_title := 'Nuevo mensaje';
    v_preview := left(trim(NEW.content), 80);
    IF v_preview IS NOT NULL AND char_length(v_preview) > 0 THEN
      v_body := v_sender_name || ': ' || v_preview;
    ELSE
      v_body := v_sender_name || ' te ha enviado un mensaje.';
    END IF;
  END IF;

  v_dedup_key := md5(concat_ws(':', v_recipient_id::TEXT, 'new_message', NEW.id::TEXT));

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
  VALUES (
    v_recipient_id,
    'new_message',
    v_title,
    v_body,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'reply_to_message_id', NEW.reply_to_message_id,
      'link', v_link
    ),
    v_dedup_key
  )
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
