import { supabase } from '../config/supabase';

export const companyService = {
  getCompanyProfile: (userId) =>
    supabase.from('company_profiles').select('*').eq('user_id', userId).single(),

  upsertCompanyProfile: (data) =>
    supabase.from('company_profiles').upsert(data).select().single(),

  getPublicProfile: (userId) =>
    supabase.from('company_profiles').select('*').eq('user_id', userId).single(),

  submitVerification: (data) =>
    supabase.from('verification_requests').insert(data).select().single(),

  getVerificationStatus: (companyId) =>
    supabase
      .from('verification_requests')
      .select('*')
      .eq('company_id', companyId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
};
