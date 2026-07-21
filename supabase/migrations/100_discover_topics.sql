-- Discover section Temas — filter publications by topic slug (no separate discover tables).
INSERT INTO public.topics (name, slug)
VALUES
  ('Contratación', 'contratacion'),
  ('Becas', 'becas'),
  ('Prácticas', 'practicas'),
  ('Eventos', 'eventos'),
  ('Convocatorias', 'convocatorias'),
  ('Cursos y certificaciones', 'cursos-certificaciones'),
  ('Voluntariado', 'voluntariado'),
  ('Oportunidades internacionales', 'oportunidades-internacionales')
ON CONFLICT DO NOTHING;
