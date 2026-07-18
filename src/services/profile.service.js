import { supabase } from '../config/supabase';
import { normalizeSkillName } from '../utils/normalizeSkill';
import { executeDelete, executeWrite } from '../utils/supabaseMutation';

/** Never request onesignal_player_id — column is revoked for clients. */
export const CANDIDATE_PROFILE_COLUMNS = [
  'user_id',
  'full_name',
  'headline',
  'about',
  'city',
  'province',
  'country',
  'avatar_path',
  'cover_path',
  'years_experience',
  'contact_email',
  'contact_whatsapp',
  'phone_number',
  'website_url',
  'linkedin_url',
  'cv_path',
  'cv_name',
  'cover_letter',
  'job_preferences',
  'notifications_enabled',
  'notification_frequency',
  'expected_salary',
  'sector',
  'show_education_in_intro',
  'intro_education_id',
  'setup_complete',
  'is_active',
  'created_at',
  'updated_at',
].join(', ');

const FULL_PROFILE_SELECT = `
  ${CANDIDATE_PROFILE_COLUMNS},
  education(*),
  experience(*),
  certifications(*),
  skills(*),
  candidate_links(*),
  services(*),
  languages(*)
`;

const PUBLIC_PROFILE_SELECT = `
  user_id, full_name, headline, about, city, province, country, sector, avatar_path, cover_path,
  years_experience, show_education_in_intro, intro_education_id,
  contact_email, contact_whatsapp, setup_complete, is_active,
  created_at, updated_at
`;

async function attachCandidateSections(profile) {
  if (!profile?.user_id) return profile;

  const userId = profile.user_id;
  const [education, experience, certifications, skills, candidate_links, services, languages] =
    await Promise.all([
      supabase.from('education').select('*').eq('user_id', userId),
      supabase.from('experience').select('*').eq('user_id', userId),
      supabase.from('certifications').select('*').eq('user_id', userId),
      supabase.from('skills').select('*').eq('user_id', userId),
      supabase.from('candidate_links').select('*').eq('user_id', userId),
      supabase.from('services').select('*').eq('user_id', userId),
      supabase.from('languages').select('*').eq('user_id', userId),
    ]);

  return {
    ...profile,
    education: education.data ?? [],
    experience: experience.data ?? [],
    certifications: certifications.data ?? [],
    skills: skills.data ?? [],
    candidate_links: candidate_links.data ?? [],
    services: services.data ?? [],
    languages: languages.data ?? [],
  };
}

export const profileService = {
  getCandidateProfile: (userId) =>
    supabase
      .from('candidate_profiles')
      .select(CANDIDATE_PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle(),

  /** Public directory read — no OneSignal, CV paths, or private internals. */
  getPublicCandidateProfile: (userId) =>
    supabase
      .from('candidate_profiles_public')
      .select(PUBLIC_PROFILE_SELECT)
      .eq('user_id', userId)
      .maybeSingle(),

  upsertCandidateProfile: (data) => {
    const safeData = { ...(data ?? {}) };
    delete safeData.onesignal_player_id;
    return executeWrite(
      supabase
        .from('candidate_profiles')
        .upsert(safeData, { onConflict: 'user_id' })
        .select(CANDIDATE_PROFILE_COLUMNS)
        .maybeSingle(),
    );
  },

  updateCandidateProfile: (userId, data) => {
    const safeData = { ...(data ?? {}) };
    delete safeData.onesignal_player_id;
    return executeWrite(
      supabase
        .from('candidate_profiles')
        .upsert({ user_id: userId, ...safeData }, { onConflict: 'user_id' })
        .select(CANDIDATE_PROFILE_COLUMNS)
        .maybeSingle(),
    );
  },

  updateOneSignalPlayerId: async (_userId, playerId) =>
    supabase.rpc('set_onesignal_player_id', { p_player_id: playerId ?? '' }),

  getCandidateFullProfile: (userId) =>
    supabase
      .from('candidate_profiles')
      .select(FULL_PROFILE_SELECT)
      .eq('user_id', userId)
      .maybeSingle(),

  getPublicCandidateFullProfile: async (userId) => {
    const { data, error } = await supabase
      .from('candidate_profiles_public')
      .select(PUBLIC_PROFILE_SELECT)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return { data, error };

    const full = await attachCandidateSections(data);
    return { data: full, error: null };
  },

  addEducation: (data) =>
    executeWrite(supabase.from('education').insert(data).select('*').maybeSingle()),
  updateEducation: (id, data) =>
    executeWrite(supabase.from('education').update(data).eq('id', id).select('*').maybeSingle()),
  deleteEducation: (id) => executeDelete(supabase.from('education').delete().eq('id', id)),

  addExperience: (data) =>
    executeWrite(supabase.from('experience').insert(data).select('*').maybeSingle()),
  updateExperience: (id, data) =>
    executeWrite(supabase.from('experience').update(data).eq('id', id).select('*').maybeSingle()),
  deleteExperience: (id) => executeDelete(supabase.from('experience').delete().eq('id', id)),

  addCertification: (data) =>
    executeWrite(supabase.from('certifications').insert(data).select('*').maybeSingle()),
  updateCertification: (id, data) =>
    executeWrite(
      supabase.from('certifications').update(data).eq('id', id).select('*').maybeSingle(),
    ),
  deleteCertification: (id) =>
    executeDelete(supabase.from('certifications').delete().eq('id', id)),

  addSkill: async (data) => {
    const normalized = normalizeSkillName(data?.name);
    if (!normalized) {
      return { data: null, error: { message: 'La habilidad no es válida.' } };
    }

    const userId = data?.user_id;
    const { data: existingSkills, error: listError } = await supabase
      .from('skills')
      .select('id, name')
      .eq('user_id', userId);

    if (listError) return { data: null, error: listError };

    const duplicate = (existingSkills ?? []).find(
      (skill) => normalizeSkillName(skill.name).toLowerCase() === normalized.toLowerCase(),
    );
    if (duplicate) return { data: duplicate, error: null };

    return executeWrite(
      supabase
        .from('skills')
        .insert({ ...data, name: normalized })
        .select('*')
        .maybeSingle(),
    );
  },
  deleteSkill: (id) => executeDelete(supabase.from('skills').delete().eq('id', id)),

  addCandidateLink: (data) =>
    executeWrite(supabase.from('candidate_links').insert(data).select('*').maybeSingle()),
  updateCandidateLink: (id, data) =>
    executeWrite(
      supabase.from('candidate_links').update(data).eq('id', id).select('*').maybeSingle(),
    ),
  deleteCandidateLink: (id) =>
    executeDelete(supabase.from('candidate_links').delete().eq('id', id)),

  addService: (data) =>
    executeWrite(supabase.from('services').insert(data).select('*').maybeSingle()),
  deleteService: (id) => executeDelete(supabase.from('services').delete().eq('id', id)),

  addLanguage: (data) =>
    executeWrite(supabase.from('languages').insert(data).select('*').maybeSingle()),
  updateLanguage: (id, data) =>
    executeWrite(supabase.from('languages').update(data).eq('id', id).select('*').maybeSingle()),
  deleteLanguage: (id) => executeDelete(supabase.from('languages').delete().eq('id', id)),

  searchCandidates: (query, limit = 20) => {
    const term = query?.trim();
    if (!term) return Promise.resolve({ data: [], error: null });

    return supabase.rpc('search_candidates', { keyword: term, p_limit: limit });
  },
};
