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
    supabase.from('candidate_profiles').select('*').eq('user_id', userId).single(),

  upsertCandidateProfile: (data) =>
    supabase.from('candidate_profiles').upsert(data).select().single(),

  updateCandidateProfile: (userId, data) =>
    supabase.from('candidate_profiles').update(data).eq('user_id', userId).select().single(),

  getCandidateFullProfile: (userId) =>
    supabase
      .from('candidate_profiles')
      .select(FULL_PROFILE_SELECT)
      .eq('user_id', userId)
      .single(),

  addEducation: (data) => supabase.from('education').insert(data).select().single(),
  updateEducation: (id, data) => supabase.from('education').update(data).eq('id', id).select().single(),
  deleteEducation: (id) => supabase.from('education').delete().eq('id', id),

  addExperience: (data) => supabase.from('experience').insert(data).select().single(),
  updateExperience: (id, data) => supabase.from('experience').update(data).eq('id', id).select().single(),
  deleteExperience: (id) => supabase.from('experience').delete().eq('id', id),

  addCertification: (data) => supabase.from('certifications').insert(data).select().single(),
  updateCertification: (id, data) => supabase.from('certifications').update(data).eq('id', id).select().single(),
  deleteCertification: (id) => supabase.from('certifications').delete().eq('id', id),

  addSkill: (data) => supabase.from('skills').insert(data).select().single(),
  deleteSkill: (id) => supabase.from('skills').delete().eq('id', id),

  addService: (data) => supabase.from('services').insert(data).select().single(),
  deleteService: (id) => supabase.from('services').delete().eq('id', id),

  addLanguage: (data) => supabase.from('languages').insert(data).select().single(),
  updateLanguage: (id, data) => supabase.from('languages').update(data).eq('id', id).select().single(),
  deleteLanguage: (id) => supabase.from('languages').delete().eq('id', id),
};
