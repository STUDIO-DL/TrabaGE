-- =============================================
-- 014_company_services_unique_name.sql
-- Prevent duplicate service names per company (case-insensitive)
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_services_unique_name
  ON public.company_services(company_id, lower(trim(name)));
