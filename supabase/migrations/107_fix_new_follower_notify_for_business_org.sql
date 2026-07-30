-- 107_fix_new_follower_notify_for_business_org.sql
-- Follow target_type is business/organization (064). Trigger still checked 'company' only,
-- so in-app + push for new followers never fired. Align with current model + prefs.

CREATE OR REPLACE FUNCTION public.notify_company_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_name TEXT;
  v_link TEXT;
BEGIN
  IF NEW.target_type NOT IN ('business', 'organization', 'company') THEN
    RETURN NEW;
  END IF;

  -- Respect notification preferences (companies_new_followers → new_follower).
  IF NOT public.user_allows_notification(NEW.target_id, 'new_follower') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(btrim(cp.full_name), ''), 'Alguien')
  INTO v_follower_name
  FROM public.candidate_profiles cp
  WHERE cp.user_id = NEW.user_id;

  IF v_follower_name IS NULL THEN
    v_follower_name := 'Alguien';
  END IF;

  v_link := CASE
    WHEN NEW.target_type = 'organization' THEN '/organization/profile'
    ELSE '/business/profile'
  END;

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata)
  VALUES (
    NEW.target_id,
    'new_follower',
    'Nuevo seguidor',
    v_follower_name || ' empezó a seguir tu cuenta.',
    jsonb_build_object(
      'follower_id', NEW.user_id,
      'target_type', NEW.target_type,
      'link', v_link
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
