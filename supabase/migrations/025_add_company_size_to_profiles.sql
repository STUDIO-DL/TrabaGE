-- =============================================
-- 025_add_company_size_to_profiles.sql
-- Add company_size to company_profiles table
-- =============================================

ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS company_size TEXT;

COMMENT ON COLUMN public.company_profiles.company_size IS 'Estimated size of the company, e.g., "1-10 employees", "11-50 employees".';