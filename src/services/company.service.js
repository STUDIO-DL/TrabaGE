import { supabase } from '../config/supabase';

const COMPANY_PROFILE_SELECT = '*, company_services(*)';

function normalizeCompanyProfile(data) {
  if (!data) return data;
  return {
    ...data,
    company_services: Array.isArray(data.company_services) ? data.company_services : [],
  };
}

async function fetchCompanyProfile(userId) {
  const result = await supabase
    .from('company_profiles')
    .select(COMPANY_PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (result.error?.code === 'PGRST200') {
    const fallback = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      ...fallback,
      data: normalizeCompanyProfile(fallback.data),
    };
  }

  return {
    ...result,
    data: normalizeCompanyProfile(result.data),
  };
}

export const companyService = {
  getCompanyProfile: (userId) => fetchCompanyProfile(userId),

  upsertCompanyProfile: async (data) => {
    const result = await supabase
      .from('company_profiles')
      .upsert(data, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();

    return {
      ...result,
      data: normalizeCompanyProfile(result.data),
    };
  },

  getPublicProfile: (userId) => fetchCompanyProfile(userId),
  addCompanyService: (data) =>
    supabase.from('company_services').insert(data).select('*').maybeSingle(),

  deleteCompanyService: (id) =>
    supabase.from('company_services').delete().eq('id', id),

  submitVerification: (data) =>
    supabase.from('verification_requests').insert(data).select('*').maybeSingle(),

  getVerificationStatus: (companyId) =>
    supabase
      .from('verification_requests')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
};
