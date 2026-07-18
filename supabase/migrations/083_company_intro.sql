-- 083_company_intro.sql
-- Short intro/tagline for business and organization profile headers

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS intro TEXT;

COMMENT ON COLUMN public.company_profiles.intro IS 'Short tagline shown under the company name in the profile header.';

-- Extend public directory view with intro
DROP VIEW IF EXISTS public.company_profiles_public CASCADE;

CREATE OR REPLACE VIEW public.company_profiles_public
WITH (security_invoker = false) AS
SELECT
  co.user_id,
  co.company_name,
  co.company_type,
  co.sector,
  co.description,
  co.intro,
  co.city,
  co.country,
  co.address,
  co.website,
  co.founded_year,
  co.company_size,
  co.logo_path,
  co.cover_path,
  co.contact_name,
  co.contact_role,
  co.contact_email,
  co.contact_phone,
  co.contact_whatsapp,
  co.social_links,
  co.is_verified,
  co.verification_status,
  co.verified_status,
  co.setup_complete,
  co.is_active,
  co.created_at,
  co.updated_at
FROM public.company_profiles co
WHERE coalesce(co.is_active, true) = true;

REVOKE ALL ON public.company_profiles_public FROM PUBLIC;
GRANT SELECT ON public.company_profiles_public TO anon, authenticated, service_role;
