-- Add cover photo URL for company profiles
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS cover_url TEXT;
