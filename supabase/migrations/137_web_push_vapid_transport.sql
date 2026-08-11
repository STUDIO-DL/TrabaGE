-- Native Web Push subscriptions. VAPID private material is only an Edge Function secret.
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS p256dh TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS auth TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE public.push_subscriptions ALTER COLUMN fcm_token DROP NOT NULL;
UPDATE public.push_subscriptions SET is_active = FALSE WHERE endpoint IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_unique ON public.push_subscriptions (user_id, endpoint) WHERE endpoint IS NOT NULL;
CREATE INDEX IF NOT EXISTS push_subscriptions_active_web_push_idx ON public.push_subscriptions (user_id, last_seen_at DESC) WHERE is_active = TRUE AND endpoint IS NOT NULL;

CREATE OR REPLACE FUNCTION public.upsert_web_push_subscription(p_endpoint TEXT, p_p256dh TEXT, p_auth TEXT, p_platform TEXT DEFAULT NULL, p_browser TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL)
RETURNS public.push_subscriptions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid(); v_row public.push_subscriptions;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NULLIF(trim(p_endpoint), '') IS NULL OR NULLIF(trim(p_p256dh), '') IS NULL OR NULLIF(trim(p_auth), '') IS NULL THEN RAISE EXCEPTION 'Valid Web Push subscription required'; END IF;
  PERFORM public.assert_rate_limit(v_uid, 'push:register', 30, interval '1 hour');
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, platform, browser, user_agent, is_active, last_seen_at, last_used_at)
  VALUES (v_uid, trim(p_endpoint), trim(p_p256dh), trim(p_auth), COALESCE(NULLIF(trim(p_platform), ''), public.detect_push_platform(p_user_agent)), NULLIF(trim(p_browser), ''), NULLIF(trim(p_user_agent), ''), TRUE, now(), now())
  ON CONFLICT (user_id, endpoint) WHERE endpoint IS NOT NULL DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, platform = EXCLUDED.platform, browser = COALESCE(EXCLUDED.browser, public.push_subscriptions.browser), user_agent = COALESCE(EXCLUDED.user_agent, public.push_subscriptions.user_agent), is_active = TRUE, last_seen_at = now(), last_used_at = now(), updated_at = now() RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
CREATE OR REPLACE FUNCTION public.deactivate_web_push_subscription(p_endpoint TEXT DEFAULT NULL) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count INT; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF; UPDATE public.push_subscriptions SET is_active = FALSE, updated_at = now() WHERE user_id = auth.uid() AND is_active = TRUE AND (p_endpoint IS NULL OR endpoint = trim(p_endpoint)); GET DIAGNOSTICS v_count = ROW_COUNT; RETURN v_count; END; $$;
DROP POLICY IF EXISTS "Users insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users insert own push subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users update own push subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON FUNCTION public.upsert_web_push_subscription(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_web_push_subscription(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.deactivate_web_push_subscription(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_web_push_subscription(TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
