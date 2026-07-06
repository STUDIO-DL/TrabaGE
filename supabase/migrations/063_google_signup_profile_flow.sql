-- =============================================
-- 063_google_signup_profile_flow.sql
--
-- STATUS: NEEDS TO BE APPLIED (not auto-run by the app).
--
-- Google/manual sign-up profile flow hardening. The app already enforces all of
-- the below client-side (shared profile bootstrap + setup gate + publish guard);
-- this migration mirrors the "cannot publish until the company/institution
-- profile is complete" rule at the database level as defense in depth.
--
-- It relies ONLY on existing columns (company_profiles.setup_complete) and does
-- NOT change the account-type / role model, so it is safe to apply to prod:
--   * role stays in public.user_roles (set via set_initial_user_role)
--   * account type stays in role + company_profiles.company_type
--   * auth provider is read from auth.users.app_metadata.provider (Google)
--   * Google identity (name/email/avatar) is stored on the profile at bootstrap
--   * profile status stays in *_profiles.setup_complete
--
-- No duplicate users/profiles: Supabase Auth keeps a single auth.users row per
-- Google identity, and the existing prevent_dual_profile_types + primary-key
-- (user_id) constraints already prevent duplicate/second profiles.
-- =============================================

-- Block a job from being (created as / moved to) ACTIVE unless the owning
-- company/institution profile has completed the required setup. Draft/paused/
-- closed states remain allowed so unfinished work is never lost.
CREATE OR REPLACE FUNCTION public.enforce_company_setup_before_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_setup_complete BOOLEAN;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT setup_complete
    INTO v_setup_complete
    FROM public.company_profiles
    WHERE user_id = NEW.company_id;

    IF COALESCE(v_setup_complete, false) = false THEN
      RAISE EXCEPTION 'Completa el perfil de tu empresa antes de publicar ofertas';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_company_setup_before_publish_trigger ON public.jobs;
CREATE TRIGGER enforce_company_setup_before_publish_trigger
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_company_setup_before_publish();
