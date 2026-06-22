-- =============================================
-- 029_add_company_type_to_profiles.sql
-- Add company_type to company_profiles table
-- =============================================

ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS company_type TEXT;

COMMENT ON COLUMN public.company_profiles.company_type IS 'Type of company, e.g., "Startup", "SME", "Corporation", "NGO".';