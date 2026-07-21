-- =============================================
-- 098_topics_system.sql
-- Official Topics catalog + post_topics junction.
-- Phase 2 will reuse topics for discover/trends/search/jobs (job_topics).
-- =============================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT topics_name_not_blank CHECK (char_length(trim(name)) > 0),
  CONSTRAINT topics_slug_not_blank CHECK (char_length(trim(slug)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS topics_name_ci_uidx
  ON public.topics (lower(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS topics_slug_uidx
  ON public.topics (slug);

CREATE INDEX IF NOT EXISTS topics_active_name_idx
  ON public.topics (is_active, name);

CREATE TABLE IF NOT EXISTS public.post_topics (
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  topic_id    UUID NOT NULL REFERENCES public.topics(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, topic_id)
);

CREATE INDEX IF NOT EXISTS post_topics_topic_id_idx
  ON public.post_topics (topic_id);

CREATE INDEX IF NOT EXISTS post_topics_post_id_idx
  ON public.post_topics (post_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.slugify_topic_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT;
BEGIN
  v := lower(trim(coalesce(p_name, '')));
  v := translate(
    v,
    'áàäâãéèëêíìïîóòöôõúùüûñç',
    'aaaaaeeeeiiiiooooouuuunc'
  );
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '(^-|-$)', '', 'g');
  IF v = '' THEN
    v := 'tema';
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.topics_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := public.slugify_topic_name(NEW.name);
  END IF;
  NEW.name := trim(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_topics_set_updated_at ON public.topics;
CREATE TRIGGER trg_topics_set_updated_at
  BEFORE INSERT OR UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.topics_set_updated_at();

-- Max 3 topics per post
CREATE OR REPLACE FUNCTION public.enforce_post_topics_max()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.post_topics
  WHERE post_id = NEW.post_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Una publicación puede tener como máximo 3 temas';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_topics_max ON public.post_topics;
CREATE TRIGGER trg_post_topics_max
  BEFORE INSERT ON public.post_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_topics_max();

-- Only active topics may be attached to posts (client path)
CREATE OR REPLACE FUNCTION public.enforce_post_topic_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_active BOOLEAN;
BEGIN
  SELECT is_active INTO v_active
  FROM public.topics
  WHERE id = NEW.topic_id;

  IF v_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'El tema no está activo o no existe';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_topic_active ON public.post_topics;
CREATE TRIGGER trg_post_topic_active
  BEFORE INSERT ON public.post_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_topic_active();

-- ---------------------------------------------------------------------------
-- Seed catalog
-- ---------------------------------------------------------------------------

INSERT INTO public.topics (name, slug)
VALUES
  ('Tecnología', 'tecnologia'),
  ('Educación', 'educacion'),
  ('Salud', 'salud'),
  ('Finanzas', 'finanzas'),
  ('Administración', 'administracion'),
  ('Recursos Humanos', 'recursos-humanos'),
  ('Comercio', 'comercio'),
  ('Transporte', 'transporte'),
  ('Energía', 'energia'),
  ('Construcción', 'construccion'),
  ('Agricultura', 'agricultura'),
  ('Hostelería', 'hosteleria'),
  ('Turismo', 'turismo'),
  ('Industria', 'industria'),
  ('Diseño', 'diseno'),
  ('Marketing', 'marketing'),
  ('Ventas', 'ventas'),
  ('Logística', 'logistica'),
  ('Emprendimiento', 'emprendimiento'),
  ('Derecho', 'derecho'),
  ('Telecomunicaciones', 'telecomunicaciones'),
  ('Medio Ambiente', 'medio-ambiente'),
  ('Arquitectura', 'arquitectura'),
  ('Ingeniería', 'ingenieria'),
  ('Investigación', 'investigacion'),
  ('Otros', 'otros')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active topics" ON public.topics;
CREATE POLICY "Public read active topics" ON public.topics
  FOR SELECT
  USING (is_active = TRUE OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin insert topics" ON public.topics;
CREATE POLICY "Admin insert topics" ON public.topics
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin update topics" ON public.topics;
CREATE POLICY "Admin update topics" ON public.topics
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin delete topics" ON public.topics;
CREATE POLICY "Admin delete topics" ON public.topics
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Public read post topics" ON public.post_topics;
CREATE POLICY "Public read post topics" ON public.post_topics
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Author insert post topics" ON public.post_topics;
CREATE POLICY "Author insert post topics" ON public.post_topics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Author delete post topics" ON public.post_topics;
CREATE POLICY "Author delete post topics" ON public.post_topics
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin manage post topics" ON public.post_topics;
CREATE POLICY "Admin manage post topics" ON public.post_topics
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

GRANT SELECT ON public.topics TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT SELECT ON public.post_topics TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.post_topics TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_topics()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  is_active BOOLEAN,
  usage_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    t.is_active,
    COALESCE(COUNT(pt.post_id), 0)::BIGINT AS usage_count,
    t.created_at,
    t.updated_at
  FROM public.topics t
  LEFT JOIN public.post_topics pt ON pt.topic_id = t.id
  GROUP BY t.id
  ORDER BY t.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_topics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_topics() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_topic(p_name TEXT)
RETURNS public.topics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_row public.topics;
BEGIN
  PERFORM public.require_admin();

  v_name := trim(coalesce(p_name, ''));
  IF v_name = '' THEN
    RAISE EXCEPTION 'El nombre del tema es obligatorio';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.topics WHERE lower(trim(name)) = lower(v_name)
  ) THEN
    RAISE EXCEPTION 'Ya existe un tema con ese nombre';
  END IF;

  INSERT INTO public.topics (name, slug)
  VALUES (v_name, public.slugify_topic_name(v_name))
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_topic(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_topic(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_topic(
  p_topic_id UUID,
  p_name TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS public.topics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_row public.topics;
BEGIN
  PERFORM public.require_admin();

  IF p_name IS NOT NULL THEN
    v_name := trim(p_name);
    IF v_name = '' THEN
      RAISE EXCEPTION 'El nombre del tema es obligatorio';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.topics
      WHERE lower(trim(name)) = lower(v_name)
        AND id <> p_topic_id
    ) THEN
      RAISE EXCEPTION 'Ya existe un tema con ese nombre';
    END IF;
  END IF;

  UPDATE public.topics
  SET
    name = COALESCE(v_name, name),
    slug = CASE
      WHEN v_name IS NOT NULL THEN public.slugify_topic_name(v_name)
      ELSE slug
    END,
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_topic_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Tema no encontrado';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_topic(UUID, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_topic(UUID, TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_deactivate_topic(p_topic_id UUID)
RETURNS public.topics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.admin_update_topic(p_topic_id, NULL, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_deactivate_topic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_topic(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_unused_topic(p_topic_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin();

  IF EXISTS (SELECT 1 FROM public.post_topics WHERE topic_id = p_topic_id) THEN
    RAISE EXCEPTION 'No se puede eliminar: el tema está en uso. Desactívalo en su lugar.';
  END IF;

  DELETE FROM public.topics WHERE id = p_topic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tema no encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_unused_topic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_unused_topic(UUID) TO authenticated;
