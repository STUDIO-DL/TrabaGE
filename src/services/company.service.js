import { supabase } from '../config/supabase';
import { normalizeJobPreferences } from '../constants/jobPreferences';
import { executeDelete, executeWrite } from '../utils/supabaseMutation';

/** Never request onesignal_player_id — column is revoked for clients. */
const COMPANY_PROFILE_COLUMNS = [
  'user_id',
  'company_name',
  'company_type',
  'sector',
  'description',
  'city',
  'country',
  'address',
  'website',
  'founded_year',
  'company_size',
  'logo_path',
  'cover_path',
  'contact_name',
  'contact_role',
  'contact_email',
  'contact_phone',
  'contact_whatsapp',
  'social_links',
  'is_verified',
  'verification_status',
  'verified_status',
  'setup_complete',
  'is_active',
  'created_at',
  'updated_at',
].join(', ');

const COMPANY_PROFILE_SELECT = `${COMPANY_PROFILE_COLUMNS}, company_services(*)`;

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
    cover_url: data.cover_url ?? data.cover_path ?? null,
    company_services: Array.isArray(data.company_services) ? data.company_services : [],
  };
}

function stripClientForbiddenFields(data) {
  const safeData = { ...(data ?? {}) };
  delete safeData.onesignal_player_id;
  delete safeData.cover_url;
  if (safeData.cover_path == null && data?.cover_url) {
    safeData.cover_path = data.cover_url;
  }
  return safeData;
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
      .select(COMPANY_PROFILE_COLUMNS)
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
    const safeData = stripClientForbiddenFields(data);
    const result = await executeWrite(
      supabase
        .from('company_profiles')
        .upsert(safeData, { onConflict: 'user_id' })
        .select(COMPANY_PROFILE_COLUMNS)
        .maybeSingle(),
    );

    return {
      ...result,
      data: normalizeCompanyProfile(result.data),
    };
  },

  updateCompanyProfile: async (userId, data) => {
    const safeData = stripClientForbiddenFields(data);
    delete safeData.user_id;
    const result = await executeWrite(
      supabase
        .from('company_profiles')
        .update(safeData)
        .eq('user_id', userId)
        .select(COMPANY_PROFILE_COLUMNS)
        .maybeSingle(),
    );

    return {
      ...result,
      data: normalizeCompanyProfile(result.data),
    };
  },

  getPublicProfile: async (userId) => {
    const publicResult = await supabase
      .from('company_profiles_public')
      .select(COMPANY_PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();

    if (publicResult.error?.code === 'PGRST205' || publicResult.error?.code === '42P01') {
      return fetchCompanyProfile(userId);
    }

    if (publicResult.error || !publicResult.data) {
      return {
        ...publicResult,
        data: normalizeCompanyProfile(publicResult.data),
      };
    }

    const servicesResult = await supabase
      .from('company_services')
      .select('*')
      .eq('company_id', userId);

    return {
      data: normalizeCompanyProfile({
        ...publicResult.data,
        company_services: servicesResult.data ?? [],
      }),
      error: servicesResult.error,
    };
  },
  addCompanyService: (data) =>
    executeWrite(supabase.from('company_services').insert(data).select('*').maybeSingle()),

  deleteCompanyService: (id) =>
    executeDelete(supabase.from('company_services').delete().eq('id', id)),

  submitVerification: (data) =>
    executeWrite(supabase.from('verification_requests').insert(data).select('*').maybeSingle()),

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
