-- 140_push_test_web_subscriptions.sql
-- Align dev test-push RPC with native Web Push subscriptions (migration 137).

CREATE OR REPLACE FUNCTION public.send_test_push_notification(
  p_title TEXT DEFAULT 'Prueba TrabaGE',
  p_body TEXT DEFAULT 'Notificación de prueba'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_has_web BOOLEAN := FALSE;
  v_has_fcm BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.push_subscriptions
    WHERE user_id = v_uid
      AND is_active = TRUE
      AND endpoint IS NOT NULL
      AND length(trim(endpoint)) > 0
      AND p256dh IS NOT NULL
      AND auth IS NOT NULL
  ) INTO v_has_web;

  SELECT EXISTS (
    SELECT 1
    FROM public.push_subscriptions
    WHERE user_id = v_uid
      AND is_active = TRUE
      AND fcm_token IS NOT NULL
      AND length(trim(fcm_token)) > 0
  ) INTO v_has_fcm;

  IF NOT v_has_web AND NOT v_has_fcm THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_push_subscriptions',
      'message', 'No hay suscripciones push activas en este dispositivo.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'recipient_id', v_uid,
    'title', COALESCE(NULLIF(trim(p_title), ''), 'Prueba TrabaGE'),
    'body', COALESCE(NULLIF(trim(p_body), ''), 'Notificación de prueba'),
    'data', jsonb_build_object(
      'type', 'system_update',
      'link', '/personal/notifications',
      'test', true
    ),
    'transport', CASE WHEN v_has_web THEN 'web_push' ELSE 'fcm' END,
    'hint', 'Invoca la edge function send_push con estos datos usando el JWT del usuario.'
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
