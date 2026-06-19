-- =============================================
-- 023_harden_handle_new_user.sql
-- Make the auth.users signup trigger fast, idempotent and non-blocking.
--
-- WHY: Supabase/GoTrue runs `AFTER INSERT ON auth.users` triggers
-- SYNCHRONOUSLY inside the signup transaction, BEFORE it redirects the
-- browser back to the app from the OAuth callback. If handle_new_user()
-- is slow, raises, locks, retries, or performs any external/HTTP I/O, the
-- whole Google sign-in/sign-up hangs on the Supabase side for a long time
-- before the app's /auth/callback page is ever reached.
--
-- This migration guarantees the trigger does only the essential role
-- bootstrap and can NEVER abort or stall user creation:
--   * minimal work (single idempotent insert into public.user_roles)
--   * pinned search_path (no resolution surprises under SECURITY DEFINER)
--   * ON CONFLICT DO NOTHING (safe on retries / re-runs)
--   * EXCEPTION WHEN OTHERS guard so any failure is swallowed and signup
--     still succeeds (role can be backfilled later by the app/RPC)
--   * NO pg_net / http / edge-function / notification / email calls in the
--     trigger path — defer all such work to async/edge/background instead.
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Essential, minimal role bootstrap the app relies on. Idempotent so a
  -- duplicate / retried insert can never raise and stall signup.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'candidate'))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  -- Never let anything in here abort or delay auth.users creation.
  -- If the role row can't be written, the app can backfill it on first
  -- load via the account-type selection / role upsert flow.
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Recreate the single expected trigger. Drop-then-create makes this safe to
-- re-run and ensures only this lightweight trigger is wired to the function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- NOTE FOR OPERATORS:
-- If the HOSTED database has any ADDITIONAL custom trigger on auth.users
-- (added directly via the SQL editor and not tracked in this repo), this
-- migration does NOT remove it. Inspect with:
--   SELECT tgname, pg_get_triggerdef(oid)
--   FROM pg_trigger
--   WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
-- Any extra trigger doing HTTP / pg_net / heavy work is a prime suspect for
-- the multi-minute OAuth callback hang and should be made async or removed.
