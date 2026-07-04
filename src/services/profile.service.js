import { supabase } from '../config/supabase';

const FULL_PROFILE_SELECT = `
  *,
  education(*),
  experience(*),
  certifications(*),
  skills(*),
  services(*),
  languages(*)
`;

export const profileService = {
  getCandidateProfile: (userId) =>
    supabase.from('candidate_profiles').select('*').eq('user_id', userId).maybeSingle(),

  upsertCandidateProfile: (data) =>
    supabase
      .from('candidate_profiles')
      .upsert(data, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle(),

  updateCandidateProfile: (userId, data) =>
    supabase
      .from('candidate_profiles')
      .update(data)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle(),

  updateOneSignalPlayerId: async (userId, playerId) => {
    const candidateResult = await supabase
      .from('candidate_profiles')
      .update({ onesignal_player_id: playerId })
      .eq('user_id', userId);

    if (!candidateResult.error) {
      const companyResult = await supabase
        .from('company_profiles')
        .update({ onesignal_player_id: playerId })
        .eq('user_id', userId);

      return companyResult.error ? candidateResult : companyResult;
    }

    return candidateResult;
  },

  getCandidateFullProfile: (userId) =>
    supabase
      .from('candidate_profiles')
      .select(FULL_PROFILE_SELECT)
      .eq('user_id', userId)
      .maybeSingle(),

  addEducation: (data) => supabase.from('education').insert(data).select('*').maybeSingle(),
  updateEducation: (id, data) => supabase.from('education').update(data).eq('id', id).select('*').maybeSingle(),
  deleteEducation: (id) => supabase.from('education').delete().eq('id', id),

  addExperience: (data) => supabase.from('experience').insert(data).select('*').maybeSingle(),
  updateExperience: (id, data) => supabase.from('experience').update(data).eq('id', id).select('*').maybeSingle(),
  deleteExperience: (id) => supabase.from('experience').delete().eq('id', id),

  addCertification: (data) => supabase.from('certifications').insert(data).select('*').maybeSingle(),
  updateCertification: (id, data) => supabase.from('certifications').update(data).eq('id', id).select('*').maybeSingle(),
  deleteCertification: (id) => supabase.from('certifications').delete().eq('id', id),

  addSkill: (data) => supabase.from('skills').insert(data).select('*').maybeSingle(),
  deleteSkill: (id) => supabase.from('skills').delete().eq('id', id),

  addService: (data) => supabase.from('services').insert(data).select('*').maybeSingle(),
  deleteService: (id) => supabase.from('services').delete().eq('id', id),

  addLanguage: (data) => supabase.from('languages').insert(data).select('*').maybeSingle(),
  updateLanguage: (id, data) => supabase.from('languages').update(data).eq('id', id).select('*').maybeSingle(),
  deleteLanguage: (id) => supabase.from('languages').delete().eq('id', id),

  searchCandidates: (query, limit = 20) => {
    const term = query?.trim();
    if (!term) return Promise.resolve({ data: [], error: null });

    return supabase.rpc('search_candidates', { keyword: term, p_limit: limit });
  },
};
