-- =============================================
-- TrabaGE - Appearance preferences
-- Per-user theme preference with RLS and localStorage fallback on the client.
-- =============================================

CREATE TABLE IF NOT EXISTS public.appearance_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appearance_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own appearance preferences" ON public.appearance_preferences;
CREATE POLICY "Users read own appearance preferences"
ON public.appearance_preferences
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own appearance preferences" ON public.appearance_preferences;
CREATE POLICY "Users insert own appearance preferences"
ON public.appearance_preferences
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own appearance preferences" ON public.appearance_preferences;
CREATE POLICY "Users update own appearance preferences"
ON public.appearance_preferences
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_appearance_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_appearance_preferences_updated_at ON public.appearance_preferences;
CREATE TRIGGER set_appearance_preferences_updated_at
  BEFORE INSERT OR UPDATE ON public.appearance_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_appearance_preferences_updated_at();

INSERT INTO public.appearance_preferences (user_id)
SELECT u.id
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_appearance_preferences()
RETURNS public.appearance_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_preferences public.appearance_preferences;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.appearance_preferences (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_preferences
  FROM public.appearance_preferences
  WHERE user_id = auth.uid();

  RETURN v_preferences;
END;
$$;

REVOKE ALL ON TABLE public.appearance_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.appearance_preferences TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_appearance_preferences() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_appearance_preferences() TO authenticated;
