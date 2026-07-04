import { supabase } from '../config/supabase';
import { normalizeJobPreferences } from '../constants/jobPreferences';

const COMPANY_PROFILE_SELECT = '*, company_services(*)';

function tokenize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9áéíóúñ]+/i)
    .filter((token) => token.length > 2);
}

function scoreCompanyForCandidate(company, candidate, followedCompanyIds = []) {
  const prefs = normalizeJobPreferences(candidate?.job_preferences);
  let score = 0;

  if (followedCompanyIds.includes(company.user_id)) score += 35;
  if (company.sector && prefs.preferred_categories.includes(company.sector)) score += 25;
  if (company.city && (prefs.preferred_locations.includes(company.city) || candidate?.city === company.city)) {
    score += 15;
  }

  const candidateTokens = new Set([
    ...tokenize(candidate?.headline),
    ...tokenize(candidate?.about),
    ...(candidate?.skills ?? []).flatMap((skill) => tokenize(skill.name)),
    ...prefs.keywords.flatMap(tokenize),
  ]);
  const companyTokens = [
    ...tokenize(company.company_name),
    ...tokenize(company.description),
    ...tokenize(company.sector),
    ...(company.company_services ?? []).flatMap((service) => tokenize(service.name)),
  ];
  const keywordMatches = companyTokens.filter((token) => candidateTokens.has(token)).length;
  score += Math.min(20, keywordMatches * 5);

  if (company.is_verified || company.verification_status === 'approved') score += 5;

  return Math.min(100, score);
}

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

  getRecommendedCompanies: async (candidate, { limit = 20 } = {}) => {
    const [companiesResult, followsResult] = await Promise.all([
      supabase
        .from('company_profiles')
        .select(COMPANY_PROFILE_SELECT)
        .eq('is_active', true)
        .limit(100),
      candidate?.user_id
        ? supabase
            .from('follows')
            .select('target_id')
            .eq('user_id', candidate.user_id)
            .eq('target_type', 'company')
        : Promise.resolve({ data: [] }),
    ]);

    if (companiesResult.error) return companiesResult;

    const followedCompanyIds = (followsResult.data ?? []).map((row) => row.target_id);
    const data = (companiesResult.data ?? [])
      .map((company) => ({
        ...normalizeCompanyProfile(company),
        recommendation_score: scoreCompanyForCandidate(company, candidate, followedCompanyIds),
      }))
      .filter((company) => company.recommendation_score > 0)
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);

    return { data, error: null };
  },
};
