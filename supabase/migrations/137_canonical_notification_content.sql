-- =============================================
-- Canonicalize user-triggered notification content.
-- Prevents an authorized event actor from replacing trusted OS-push text/data
-- with arbitrary content before send_push loads the notification row.
-- =============================================

CREATE OR REPLACE FUNCTION public.canonicalize_notification_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID;
  v_application_id UUID;
  v_comment_id UUID;
  v_job_id UUID;
  v_post_id UUID;
  v_request_id UUID;
  v_actor_name TEXT;
  v_city TEXT;
  v_comment_body TEXT;
  v_job_title TEXT;
  v_link TEXT;
  v_post_content TEXT;
  v_target_type TEXT;
BEGIN
  -- Self notifications never leave the caller's own devices and may carry
  -- client-specific diagnostic text.
  IF auth.uid() IS NOT NULL AND NEW.recipient_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.type = 'new_job' THEN
    v_job_id := NULLIF(NEW.metadata->>'job_id', '')::UUID;
    v_actor_id := COALESCE(
      NULLIF(NEW.metadata->>'actor_id', '')::UUID,
      NULLIF(NEW.metadata->>'target_id', '')::UUID,
      auth.uid()
    );

    SELECT j.title, j.city
    INTO v_job_title, v_city
    FROM public.jobs j
    WHERE j.id = v_job_id
      AND j.company_id = v_actor_id
      AND j.status = 'active'
    LIMIT 1;

    IF v_job_title IS NULL THEN
      RAISE EXCEPTION 'Invalid new job notification';
    END IF;

    v_actor_name := public.messaging_display_name(v_actor_id);
    IF v_actor_name = 'Usuario' THEN v_actor_name := NULL; END IF;
    v_target_type := COALESCE(NULLIF(NEW.metadata->>'target_type', ''), 'business');
    NEW.title := CASE
      WHEN v_actor_name IS NOT NULL THEN 'Nueva oferta de ' || v_actor_name
      ELSE 'Nueva oferta publicada'
    END;
    NEW.body := v_job_title || CASE
      WHEN NULLIF(trim(COALESCE(v_city, '')), '') IS NOT NULL
        THEN ' - ' || trim(v_city)
      ELSE ''
    END;
    NEW.metadata := jsonb_build_object(
      'target_type', v_target_type,
      'target_id', v_actor_id,
      'job_id', v_job_id,
      'actor_id', v_actor_id,
      'actor_type', v_target_type,
      'link', '/personal/jobs/' || v_job_id::TEXT
    );
    RETURN NEW;
  END IF;

  IF NEW.type = 'new_post' THEN
    v_post_id := NULLIF(NEW.metadata->>'post_id', '')::UUID;
    v_actor_id := COALESCE(
      NULLIF(NEW.metadata->>'actor_id', '')::UUID,
      NULLIF(NEW.metadata->>'target_id', '')::UUID,
      auth.uid()
    );

    SELECT p.content
    INTO v_post_content
    FROM public.posts p
    WHERE p.id = v_post_id
      AND p.author_id = v_actor_id
      AND coalesce(p.is_hidden, false) = false
    LIMIT 1;

    IF v_post_content IS NULL THEN
      RAISE EXCEPTION 'Invalid new post notification';
    END IF;

    v_actor_name := public.messaging_display_name(v_actor_id);
    IF v_actor_name = 'Usuario' THEN v_actor_name := 'Empresa'; END IF;
    v_target_type := COALESCE(NULLIF(NEW.metadata->>'target_type', ''), 'business');
    NEW.title := 'Nueva publicación de ' || v_actor_name;
    NEW.body := COALESCE(NULLIF(LEFT(trim(v_post_content), 120), ''), 'Nueva actualización');
    NEW.metadata := jsonb_build_object(
      'target_type', v_target_type,
      'target_id', v_actor_id,
      'post_id', v_post_id,
      'actor_id', v_actor_id,
      'actor_type', v_target_type,
      'link', '/post/' || v_post_id::TEXT
    );
    RETURN NEW;
  END IF;

  IF NEW.type = 'new_application' THEN
    v_job_id := NULLIF(NEW.metadata->>'job_id', '')::UUID;
    v_actor_id := COALESCE(
      NULLIF(NEW.metadata->>'actor_id', '')::UUID,
      NULLIF(NEW.metadata->>'candidate_id', '')::UUID,
      auth.uid()
    );

    SELECT j.title
    INTO v_job_title
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = v_actor_id
      AND a.job_id = v_job_id
      AND j.company_id = NEW.recipient_id
    LIMIT 1;

    IF v_job_title IS NULL THEN
      RAISE EXCEPTION 'Invalid new application notification';
    END IF;

    v_actor_name := public.messaging_display_name(v_actor_id);
    IF v_actor_name = 'Usuario' THEN v_actor_name := 'Alguien'; END IF;
    v_link := COALESCE(public.role_path_prefix(NEW.recipient_id), '/business') || '/applicants';
    NEW.title := 'Nueva candidatura recibida';
    NEW.body := v_actor_name || ' aplicó a "' || v_job_title || '".';
    NEW.metadata := jsonb_build_object(
      'job_id', v_job_id,
      'candidate_id', v_actor_id,
      'actor_id', v_actor_id,
      'actor_type', 'personal',
      'link', v_link
    );
    RETURN NEW;
  END IF;

  IF NEW.type IN (
    'application_viewed',
    'application_contacted',
    'application_accepted',
    'application_rejected'
  ) THEN
    v_application_id := NULLIF(NEW.metadata->>'application_id', '')::UUID;

    SELECT a.job_id, j.title
    INTO v_job_id, v_job_title
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = v_application_id
      AND a.candidate_id = NEW.recipient_id
      AND j.company_id = auth.uid()
    LIMIT 1;

    IF v_job_title IS NULL THEN
      RAISE EXCEPTION 'Invalid application status notification';
    END IF;

    CASE NEW.type
      WHEN 'application_viewed' THEN
        NEW.title := 'Tu aplicación fue vista';
        NEW.body := 'La empresa revisó tu aplicación para "' || v_job_title || '".';
      WHEN 'application_contacted' THEN
        NEW.title := 'La empresa quiere contactarte';
        NEW.body := 'Tu aplicación para "' || v_job_title || '" avanzó a contacto.';
      WHEN 'application_accepted' THEN
        NEW.title := 'Aplicación aceptada';
        NEW.body := 'Buenas noticias. Tu aplicación para "' || v_job_title || '" fue aceptada.';
      WHEN 'application_rejected' THEN
        NEW.title := 'Aplicación no seleccionada';
        NEW.body := 'Tu aplicación para "' || v_job_title || '" no fue seleccionada esta vez.';
    END CASE;

    NEW.metadata := jsonb_build_object(
      'application_id', v_application_id,
      'job_id', v_job_id,
      'link', '/personal/applications'
    );
    RETURN NEW;
  END IF;

  IF NEW.type IN ('verification_approved', 'verification_rejected') THEN
    v_request_id := NULLIF(NEW.metadata->>'request_id', '')::UUID;

    IF NOT EXISTS (
      SELECT 1
      FROM public.verification_requests vr
      WHERE vr.id = v_request_id
        AND vr.company_id = NEW.recipient_id
    ) THEN
      RAISE EXCEPTION 'Invalid verification notification';
    END IF;

    IF NEW.type = 'verification_approved' THEN
      NEW.title := 'Empresa verificada';
      NEW.body := 'Tu empresa ha sido verificada correctamente.';
    ELSE
      NEW.title := 'Verificación rechazada';
      NEW.body := 'Tu solicitud de verificación necesita correcciones.';
    END IF;

    v_link := COALESCE(public.role_path_prefix(NEW.recipient_id), '/business') || '/verification';
    NEW.metadata := jsonb_build_object(
      'request_id', v_request_id,
      'link', v_link
    );
    RETURN NEW;
  END IF;

  IF NEW.type = 'post_like' THEN
    v_post_id := NULLIF(NEW.metadata->>'post_id', '')::UUID;
    v_actor_id := NULLIF(NEW.metadata->>'actor_id', '')::UUID;

    IF NOT EXISTS (
      SELECT 1
      FROM public.post_likes pl
      JOIN public.posts p ON p.id = pl.post_id
      WHERE pl.post_id = v_post_id
        AND pl.user_id = v_actor_id
        AND p.author_id = NEW.recipient_id
    ) THEN
      RAISE EXCEPTION 'Invalid post like notification';
    END IF;

    v_actor_name := public.messaging_display_name(v_actor_id);
    IF v_actor_name = 'Usuario' THEN v_actor_name := 'Alguien'; END IF;
    NEW.title := v_actor_name || ' le dio Me gusta a tu publicación';
    NEW.body := NULL;
  ELSIF NEW.type = 'comment_like' THEN
    v_comment_id := NULLIF(NEW.metadata->>'comment_id', '')::UUID;
    v_post_id := NULLIF(NEW.metadata->>'post_id', '')::UUID;
    v_actor_id := NULLIF(NEW.metadata->>'actor_id', '')::UUID;

    IF NOT EXISTS (
      SELECT 1
      FROM public.comment_likes cl
      JOIN public.post_comments c ON c.id = cl.comment_id
      WHERE cl.comment_id = v_comment_id
        AND cl.user_id = v_actor_id
        AND c.post_id = v_post_id
        AND c.author_id = NEW.recipient_id
    ) THEN
      RAISE EXCEPTION 'Invalid comment like notification';
    END IF;

    v_actor_name := public.messaging_display_name(v_actor_id);
    IF v_actor_name = 'Usuario' THEN v_actor_name := 'Alguien'; END IF;
    NEW.title := v_actor_name || ' le dio Me gusta a tu comentario';
    NEW.body := NULL;
  ELSIF NEW.type IN ('post_comment', 'post_comment_reply') THEN
    v_comment_id := NULLIF(NEW.metadata->>'comment_id', '')::UUID;
    v_post_id := NULLIF(NEW.metadata->>'post_id', '')::UUID;
    v_actor_id := NULLIF(NEW.metadata->>'actor_id', '')::UUID;

    SELECT c.body
    INTO v_comment_body
    FROM public.post_comments c
    JOIN public.posts p ON p.id = c.post_id
    LEFT JOIN public.post_comments parent ON parent.id = c.parent_id
    WHERE c.id = v_comment_id
      AND c.post_id = v_post_id
      AND c.author_id = v_actor_id
      AND (
        (NEW.type = 'post_comment' AND p.author_id = NEW.recipient_id)
        OR
        (NEW.type = 'post_comment_reply' AND parent.author_id = NEW.recipient_id)
      )
    LIMIT 1;

    IF v_comment_body IS NULL THEN
      RAISE EXCEPTION 'Invalid post comment notification';
    END IF;

    v_actor_name := public.messaging_display_name(v_actor_id);
    IF v_actor_name = 'Usuario' THEN v_actor_name := 'Alguien'; END IF;
    NEW.title := CASE
      WHEN NEW.type = 'post_comment_reply'
        THEN v_actor_name || ' respondió a tu comentario'
      ELSE v_actor_name || ' comentó tu publicación'
    END;
    NEW.body := LEFT(trim(v_comment_body), 120);
  ELSIF NEW.type = 'post_repost' THEN
    v_post_id := NULLIF(NEW.metadata->>'post_id', '')::UUID;
    v_actor_id := NULLIF(NEW.metadata->>'actor_id', '')::UUID;

    SELECT pr.commentary
    INTO v_comment_body
    FROM public.post_reposts pr
    JOIN public.posts p ON p.id = pr.post_id
    WHERE pr.post_id = v_post_id
      AND pr.user_id = v_actor_id
      AND p.author_id = NEW.recipient_id
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid post repost notification';
    END IF;

    v_actor_name := public.messaging_display_name(v_actor_id);
    IF v_actor_name = 'Usuario' THEN v_actor_name := 'Alguien'; END IF;
    NEW.title := v_actor_name || ' compartió tu publicación.';
    NEW.body := NULLIF(LEFT(trim(COALESCE(v_comment_body, '')), 120), '');
  ELSE
    RETURN NEW;
  END IF;

  NEW.metadata := jsonb_build_object(
    'post_id', v_post_id,
    'actor_id', v_actor_id,
    'target_type', 'post',
    'target_id', v_post_id,
    'link', '/post/' || v_post_id::TEXT
  ) || CASE
    WHEN v_comment_id IS NOT NULL
      THEN jsonb_build_object('comment_id', v_comment_id)
    ELSE '{}'::jsonb
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS canonicalize_notification_content_trigger
  ON public.notifications;
CREATE TRIGGER canonicalize_notification_content_trigger
  BEFORE INSERT OR UPDATE OF recipient_id, type, title, body, metadata
  ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.canonicalize_notification_content();

REVOKE ALL ON FUNCTION public.canonicalize_notification_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.canonicalize_notification_content() TO postgres, service_role;

NOTIFY pgrst, 'reload schema';
