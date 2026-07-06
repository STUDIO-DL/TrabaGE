-- =============================================
-- 059_professional_profile_enhancements.sql
-- Candidate professional profile enhancements (links, normalization, fields)
-- =============================================

ALTER TABLE public.experience
  ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE public.education
  ADD COLUMN IF NOT EXISTS specialty TEXT;

CREATE TABLE IF NOT EXISTS public.candidate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'portfolio'
    CHECK (type IN ('github', 'linkedin', 'website', 'behance', 'dribbble', 'portfolio', 'other')),
  url TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS candidate_links_user_sort_idx
  ON public.candidate_links (user_id, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS candidate_links_url_idx
  ON public.candidate_links (user_id, lower(url));

ALTER TABLE public.candidate_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own candidate links" ON public.candidate_links;
CREATE POLICY "Users can manage their own candidate links"
ON public.candidate_links FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view candidate links of active profiles" ON public.candidate_links;
CREATE POLICY "Authenticated users can view candidate links of active profiles"
ON public.candidate_links FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = candidate_links.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_links TO authenticated;

-- Backfill candidate_links from legacy candidate profile URLs.
INSERT INTO public.candidate_links (user_id, type, url, label, sort_order)
SELECT cp.user_id, 'website', cp.website_url, 'Sitio web', 0
FROM public.candidate_profiles cp
WHERE cp.website_url IS NOT NULL
  AND cp.website_url <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.candidate_links cl
    WHERE cl.user_id = cp.user_id
      AND lower(cl.url) = lower(cp.website_url)
  );

INSERT INTO public.candidate_links (user_id, type, url, label, sort_order)
SELECT cp.user_id, 'linkedin', cp.linkedin_url, 'LinkedIn', 1
FROM public.candidate_profiles cp
WHERE cp.linkedin_url IS NOT NULL
  AND cp.linkedin_url <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.candidate_links cl
    WHERE cl.user_id = cp.user_id
      AND lower(cl.url) = lower(cp.linkedin_url)
  );

-- Skills canonical dedupe protection (case-insensitive).
DELETE FROM public.skills s
USING public.skills d
WHERE s.user_id = d.user_id
  AND lower(s.name) = lower(d.name)
  AND s.id > d.id;

CREATE UNIQUE INDEX IF NOT EXISTS skills_user_lower_name_unique_idx
  ON public.skills (user_id, lower(name));
