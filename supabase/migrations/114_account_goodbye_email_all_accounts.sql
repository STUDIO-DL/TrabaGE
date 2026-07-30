-- 114_account_goodbye_email_all_accounts.sql
-- Fix goodbye email for ALL account types (personal + business + organization).
-- Server-side dispatch via pg_net on outbox INSERT (non-blocking).
-- Client remains a best-effort fallback. Deletion never fails on email errors.
--
-- Rollback notes:
--   DROP TRIGGER IF EXISTS trg_account_goodbye_email_outbox_notify ON public.account_goodbye_email_outbox;
--   DROP FUNCTION IF EXISTS public.notify_account_goodbye_email_outbox();
--   DROP FUNCTION IF EXISTS public.delete_own_account(boolean);
--   Recreate prior delete_own_account() from 105 if needed.
--   Revert account_type check to ('business','organization') if required.

-- ─── Allow personal accounts in outbox ──────────────────────────────────────

ALTER TABLE public.account_goodbye_email_outbox
  DROP CONSTRAINT IF EXISTS account_goodbye_email_outbox_account_type_check;

ALTER TABLE public.account_goodbye_email_outbox
  ADD CONSTRAINT account_goodbye_email_outbox_account_type_check
  CHECK (account_type IN ('personal', 'business', 'organization'));

-- ─── Server-side notify (pg_net) — never raises to caller ────────────────

CREATE OR REPLACE FUNCTION public.notify_account_goodbye_email_outbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
    WHERE name = 'account_goodbye_email_url'
    LIMIT 1;

    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'account_goodbye_email_anon_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
    v_key := NULL;
  END;

  IF v_url IS NULL OR length(trim(v_url)) = 0 OR v_key IS NULL OR length(trim(v_key)) = 0 THEN
    -- Client fallback / Database Webhook still available.
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := trim(v_url),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || trim(v_key),
        'apikey', trim(v_key)
      ),
      body := jsonb_build_object(
        'token', NEW.send_token,
        'goodbye_token', NEW.send_token
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'account goodbye pg_net notify failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_account_goodbye_email_outbox_notify
  ON public.account_goodbye_email_outbox;

CREATE TRIGGER trg_account_goodbye_email_outbox_notify
  AFTER INSERT ON public.account_goodbye_email_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_account_goodbye_email_outbox();

-- ─── delete_own_account: capture email BEFORE delete; all account types ─

DROP FUNCTION IF EXISTS public.delete_own_account();
DROP FUNCTION IF EXISTS public.delete_own_account(boolean);

CREATE OR REPLACE FUNCTION public.delete_own_account(
  p_send_goodbye boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_role text;
  v_account_type text;
  v_token uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Capture identity BEFORE deleting auth.users (email disappears with the row).
  SELECT btrim(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  SELECT lower(btrim(r.role)) INTO v_role
  FROM public.user_roles r
  WHERE r.user_id = v_uid;

  IF coalesce(p_send_goodbye, true)
     AND v_email IS NOT NULL
     AND v_email <> ''
     AND v_role IS NOT NULL
     AND v_role <> 'admin' THEN
    v_account_type := CASE
      WHEN v_role IN ('organization') THEN 'organization'
      WHEN v_role IN ('business', 'company') THEN 'business'
      WHEN v_role IN ('personal', 'candidate') THEN 'personal'
      ELSE NULL
    END;

    IF v_account_type IS NOT NULL THEN
      v_token := gen_random_uuid();

      INSERT INTO public.account_goodbye_email_outbox (
        email,
        account_type,
        send_token,
        status
      ) VALUES (
        v_email,
        v_account_type,
        v_token,
        'pending'
      );
    END IF;
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;

  IF v_token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'goodbye_token', v_token,
      'account_type', v_account_type
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account(boolean) TO authenticated;

-- Zero-arg overload for older clients / PostgREST calls without body.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.delete_own_account(true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account(boolean) IS
  'Deletes the authenticated user. Queues farewell email (all account types except admin) before auth.users delete. p_send_goodbye=false for orphan OAuth cleanup.';

-- Optional retry cron for pending/failed outbox (requires vault + pg_cron).
DO $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'goodbye retry cron skipped (extensions): %', SQLERRM;
    RETURN;
  END;

  BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'account_goodbye_email_url' LIMIT 1;
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'account_goodbye_email_anon_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF v_url IS NULL OR v_key IS NULL OR length(trim(v_url)) = 0 OR length(trim(v_key)) = 0 THEN
    RAISE NOTICE 'Skipping goodbye retry cron: vault secrets not set';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'trabage_account_goodbye_retry';

  PERFORM cron.schedule(
    'trabage_account_goodbye_retry',
    '*/5 * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L,
          'apikey', %L
        ),
        body := jsonb_build_object('token', o.send_token)
      )
      FROM public.account_goodbye_email_outbox o
      WHERE o.status IN ('pending', 'failed')
        AND o.created_at > NOW() - INTERVAL '7 days'
      ORDER BY o.created_at ASC
      LIMIT 20;
      $cron$,
      trim(v_url),
      trim(v_key),
      trim(v_key)
    )
  );

  RAISE NOTICE 'Scheduled trabage_account_goodbye_retry cron (*/5)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule goodbye retry cron: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';
