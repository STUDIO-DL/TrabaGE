-- 111_maintenance_mode.sql
-- Professional maintenance mode: single-row settings + public status RPC + admin updater.
-- Auto-disables when end_at is reached (evaluated on each status read).

CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT NOT NULL DEFAULT '',
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT maintenance_settings_window_chk
    CHECK (end_at IS NULL OR start_at IS NULL OR end_at > start_at)
);

INSERT INTO public.maintenance_settings (id, enabled, message)
VALUES (
  1,
  FALSE,
  'Estamos realizando tareas de mantenimiento para mejorar TrabaGE. Volveremos muy pronto. Gracias por tu paciencia.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed from legacy platform_settings.maintenance_mode if previously enabled.
UPDATE public.maintenance_settings ms
SET
  enabled = TRUE,
  updated_at = NOW()
FROM public.platform_settings ps
WHERE ms.id = 1
  AND ps.id = 1
  AND ps.maintenance_mode = TRUE
  AND ms.enabled = FALSE;

ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read maintenance settings" ON public.maintenance_settings;
CREATE POLICY "Anyone can read maintenance settings"
  ON public.maintenance_settings
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins update maintenance settings" ON public.maintenance_settings;
CREATE POLICY "Admins update maintenance settings"
  ON public.maintenance_settings
  FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

REVOKE ALL ON public.maintenance_settings FROM PUBLIC;
GRANT SELECT ON public.maintenance_settings TO anon, authenticated;
GRANT UPDATE ON public.maintenance_settings TO authenticated;

-- Keep legacy boolean in sync for any older consumers.
CREATE OR REPLACE FUNCTION public.sync_platform_maintenance_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.platform_settings
  SET maintenance_mode = NEW.enabled, updated_at = NOW()
  WHERE id = 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_platform_maintenance ON public.maintenance_settings;
CREATE TRIGGER trg_sync_platform_maintenance
  AFTER INSERT OR UPDATE OF enabled ON public.maintenance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_platform_maintenance_flag();

CREATE OR REPLACE FUNCTION public.get_maintenance_status()
RETURNS TABLE (
  enabled BOOLEAN,
  message TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_active BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.maintenance_settings%ROWTYPE;
  v_active BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_row
  FROM public.maintenance_settings
  WHERE id = 1;

  IF NOT FOUND THEN
    enabled := FALSE;
    message := '';
    start_at := NULL;
    end_at := NULL;
    is_active := FALSE;
    updated_at := NOW();
    RETURN NEXT;
    RETURN;
  END IF;

  -- Auto-disable when the scheduled end has passed (idempotent).
  IF v_row.enabled AND v_row.end_at IS NOT NULL AND v_row.end_at <= NOW() THEN
    UPDATE public.maintenance_settings
    SET enabled = FALSE, updated_at = NOW()
    WHERE id = 1
      AND enabled = TRUE
      AND end_at IS NOT NULL
      AND end_at <= NOW()
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
      SELECT * INTO v_row FROM public.maintenance_settings WHERE id = 1;
    END IF;
  END IF;

  v_active :=
    v_row.enabled
    AND (v_row.start_at IS NULL OR v_row.start_at <= NOW())
    AND (v_row.end_at IS NULL OR v_row.end_at > NOW());

  enabled := v_row.enabled;
  message := coalesce(nullif(trim(v_row.message), ''), '');
  start_at := v_row.start_at;
  end_at := v_row.end_at;
  is_active := v_active;
  updated_at := v_row.updated_at;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_maintenance_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_maintenance_status() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_maintenance_settings(
  p_enabled BOOLEAN,
  p_message TEXT DEFAULT NULL,
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL,
  p_clear_start BOOLEAN DEFAULT FALSE,
  p_clear_end BOOLEAN DEFAULT FALSE
)
RETURNS public.maintenance_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.maintenance_settings;
  v_message TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL OR public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'admin:maintenance', 30, interval '1 hour');

  SELECT * INTO v_row FROM public.maintenance_settings WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.maintenance_settings (id) VALUES (1)
    RETURNING * INTO v_row;
  END IF;

  v_message := CASE
    WHEN p_message IS NULL THEN v_row.message
    ELSE left(trim(p_message), 1000)
  END;

  IF p_clear_start THEN
    v_start := NULL;
  ELSIF p_start_at IS NOT NULL THEN
    v_start := p_start_at;
  ELSE
    v_start := v_row.start_at;
  END IF;

  IF p_clear_end THEN
    v_end := NULL;
  ELSIF p_end_at IS NOT NULL THEN
    v_end := p_end_at;
  ELSE
    v_end := v_row.end_at;
  END IF;

  IF v_start IS NOT NULL AND v_end IS NOT NULL AND v_end <= v_start THEN
    RAISE EXCEPTION 'La fecha de finalización debe ser posterior al inicio';
  END IF;

  UPDATE public.maintenance_settings
  SET
    enabled = coalesce(p_enabled, enabled),
    message = coalesce(nullif(v_message, ''), message),
    start_at = v_start,
    end_at = v_end,
    updated_by = v_uid,
    updated_at = NOW()
  WHERE id = 1
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_maintenance_settings(BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_maintenance_settings(BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN) TO authenticated;

-- Realtime for instant client updates (ignore if publication already has the table).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_settings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
