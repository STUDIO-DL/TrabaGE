-- Do not expose an email signup as a TrabaGE account until its address is confirmed.
-- auth.users is intentionally retained by Supabase so the same email can confirm later.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider TEXT := lower(coalesce(
    NEW.raw_app_meta_data->>'provider',
    NEW.raw_app_meta_data->'providers'->>0,
    ''
  ));
  v_role TEXT := lower(coalesce(NEW.raw_user_meta_data->>'role', 'personal'));
BEGIN
  -- Email signups are pending until Supabase stamps a confirmation time.
  IF v_provider IN ('', 'email')
     AND NEW.email_confirmed_at IS NULL
     AND NEW.confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_role = 'candidate' THEN v_role := 'personal'; END IF;
  IF v_role = 'company' THEN v_role := 'business'; END IF;
  IF v_role = 'institution' THEN v_role := 'organization'; END IF;
  IF v_role NOT IN ('personal', 'business', 'organization') THEN v_role := 'personal'; END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_role ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_role
  AFTER UPDATE OF email_confirmed_at, confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL OR NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Remove application rows left by older deployments for still-unconfirmed email users.
DELETE FROM public.candidate_profiles cp
USING auth.users au
WHERE au.id = cp.user_id
  AND coalesce(au.raw_app_meta_data->>'provider', 'email') = 'email'
  AND au.email_confirmed_at IS NULL
  AND au.confirmed_at IS NULL;

DELETE FROM public.company_profiles cp
USING auth.users au
WHERE au.id = cp.user_id
  AND coalesce(au.raw_app_meta_data->>'provider', 'email') = 'email'
  AND au.email_confirmed_at IS NULL
  AND au.confirmed_at IS NULL;

DELETE FROM public.user_roles ur
USING auth.users au
WHERE au.id = ur.user_id
  AND coalesce(au.raw_app_meta_data->>'provider', 'email') = 'email'
  AND au.email_confirmed_at IS NULL
  AND au.confirmed_at IS NULL;