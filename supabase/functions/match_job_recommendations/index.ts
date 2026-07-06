import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SCORE_WEIGHTS = {
  role: 25,
  skills: 28,
  experience: 15,
  location: 10,
  workMode: 10,
  availability: 5,
  languages: 4,
  education: 3,
  recentActivity: 5,
};

const MATCH_THRESHOLD = 70;

const STOP_WORDS = new Set(['para', 'con', 'del', 'los', 'las', 'una', 'uno', 'por', 'que', 'de', 'en', 'el', 'la']);

const EXPERIENCE_KEYWORDS: Record<string, string[]> = {
  none: ['sin experiencia', 'no experience', 'entry level', 'primer empleo'],
  junior: ['junior', '1 año', '1-2', '0-2', 'recién graduado'],
  mid: ['intermedio', 'mid', '2-5', '3-5', '3 años', '4 años', '5 años'],
  senior: ['senior', '5+', '6+', '7+', '8+', 'experiencia avanzada', 'lead'],
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9áéíóúñ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function parseRequirements(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed.map(String) : [String(raw)];
  } catch {
    return [String(raw)];
  }
}

function normalizeJobPreferences(raw: Record<string, unknown> | null | undefined) {
  const preferredCities = Array.isArray(raw?.preferred_cities) ? raw!.preferred_cities.filter(Boolean) : [];
  const preferredLocations = Array.isArray(raw?.preferred_locations)
    ? raw!.preferred_locations.filter(Boolean)
    : preferredCities;
  const preferredSectors = Array.isArray(raw?.preferred_sectors) ? raw!.preferred_sectors.filter(Boolean) : [];
  const preferredCategories = Array.isArray(raw?.preferred_categories)
    ? raw!.preferred_categories.filter(Boolean)
    : preferredSectors;

  return {
    preferred_locations: preferredLocations as string[],
    preferred_job_types: Array.isArray(raw?.preferred_job_types) ? raw!.preferred_job_types.filter(Boolean) as string[] : [],
    preferred_work_modes: Array.isArray(raw?.preferred_work_modes)
      ? raw!.preferred_work_modes.filter(Boolean) as string[]
      : Array.isArray(raw?.work_modes)
        ? raw!.work_modes.filter(Boolean) as string[]
        : [],
    preferred_categories: preferredCategories as string[],
    keywords: Array.isArray(raw?.keywords) ? raw!.keywords.filter(Boolean) as string[] : [],
    experience_level: (raw?.experience_level as string) || null,
    availability: (raw?.availability as string) || null,
    expected_salary: raw?.expected_salary ?? raw?.salary_expected ?? null,
    education_level: (raw?.education_level as string) || null,
    languages: Array.isArray(raw?.languages) ? raw!.languages.filter(Boolean) as string[] : [],
  };
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function asList(value: unknown): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [String(value)];
}

function extractSalaryNumber(value: unknown) {
  if (value == null) return null;
  const numbers = String(value)
    .match(/\d[\d.,]*/g)
    ?.map((item) => Number(item.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')))
    .filter((item) => Number.isFinite(item));
  return numbers?.length ? Math.max(...numbers) : null;
}

function inferEducationLevelFromText(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  if (/(master|maestr|posgrado|postgrado|mba)/.test(text)) return 'master';
  if (/(licenci|grado|universit|ingenier|bachelor)/.test(text)) return 'degree';
  if (/(tecnico|técnico|fp|formacion profesional)/.test(text)) return 'technical';
  if (/(bachiller|secundaria)/.test(text)) return 'secondary';
  return null;
}

function educationMeetsRequirement(userLevel: string | null, requiredLevel: string | null) {
  if (!userLevel || !requiredLevel) return false;
  const order = ['secondary', 'technical', 'degree', 'master'];
  return order.indexOf(userLevel) >= order.indexOf(requiredLevel);
}

function buildJobHaystack(job: Record<string, unknown>, company: Record<string, unknown> | null) {
  const requirements = parseRequirements(job.requirements);
  return [
    job.title,
    job.description,
    requirements.join(' '),
    company?.sector,
    company?.company_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function inferExperienceLevelFromYears(years: number | null | undefined) {
  if (years == null) return null;
  if (years <= 0) return 'none';
  if (years <= 2) return 'junior';
  if (years <= 5) return 'mid';
  return 'senior';
}

function inferJobExperienceLevel(job: Record<string, unknown>, company: Record<string, unknown> | null) {
  const haystack = buildJobHaystack(job, company);
  for (const [level, keywords] of Object.entries(EXPERIENCE_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return level;
  }
  return null;
}

function experienceLevelsCompatible(userLevel: string | null, jobLevel: string | null) {
  if (!userLevel || !jobLevel) return false;
  if (userLevel === jobLevel) return true;
  const order = ['none', 'junior', 'mid', 'senior'];
  return order.indexOf(userLevel) >= order.indexOf(jobLevel);
}

function extractUserKeywords(candidate: Record<string, unknown>) {
  const prefs = normalizeJobPreferences(candidate.job_preferences as Record<string, unknown>);
  const skills = ((candidate.skills as Array<{ name: string }>) ?? []).map((item) => item.name);
  const experience = ((candidate.experience as Array<{ position: string }>) ?? []).map((item) => item.position);
  const education = ((candidate.education as Array<Record<string, string>>) ?? [])
    .map((item) => [item.degree, item.field, item.program, item.grade, item.institution].filter(Boolean).join(' '));
  const languages = ((candidate.languages as Array<{ language: string }>) ?? []).map((item) => item.language);
  return [...new Set(tokenize([candidate.headline, candidate.about, ...skills, ...experience, ...education, ...languages, ...prefs.keywords].join(' ')))];
}

function extractJobKeywords(job: Record<string, unknown>, company: Record<string, unknown> | null) {
  const requirements = parseRequirements(job.requirements);
  return [...new Set(tokenize([
    job.title,
    job.description,
    asList(job.required_skills).join(' '),
    job.category,
    job.sector,
    job.education_level,
    asList(job.required_languages).join(' '),
    requirements.join(' '),
    company?.sector,
  ].join(' ')))];
}

function scoreRatio(matches: number, total: number, weight: number) {
  if (!total) return 0;
  return Math.round(Math.min(1, matches / total) * weight);
}

function skillScore(candidate: Record<string, unknown>, job: Record<string, unknown>, company: Record<string, unknown> | null) {
  const userSkills = [...new Set(((candidate.skills as Array<{ name: string }>) ?? []).map((item) => item.name).flatMap(tokenize))];
  const userKeywords = extractUserKeywords(candidate);
  const requiredSkills = [...new Set([
    ...asList(job.required_skills).flatMap(tokenize),
    ...parseRequirements(job.requirements).flatMap(tokenize),
    ...tokenize(String(job.title ?? '')),
  ])];
  const jobKeywords = requiredSkills.length ? requiredSkills : extractJobKeywords(job, company);
  if (!userKeywords.length || !jobKeywords.length) return 0;

  const jobSet = new Set(jobKeywords);
  const strongMatches = userSkills.filter((keyword) => jobSet.has(keyword)).length;
  const keywordMatches = userKeywords.filter((keyword) => jobSet.has(keyword)).length;

  if (requiredSkills.length) {
    return scoreRatio(strongMatches * 1.5 + keywordMatches * 0.5, requiredSkills.length, SCORE_WEIGHTS.skills);
  }
  return scoreRatio(keywordMatches, Math.max(userKeywords.length, 1), SCORE_WEIGHTS.skills);
}

function experienceScore(candidate: Record<string, unknown>, job: Record<string, unknown>, company: Record<string, unknown> | null) {
  const prefs = normalizeJobPreferences(candidate.job_preferences as Record<string, unknown>);
  const userLevel = prefs.experience_level || inferExperienceLevelFromYears(candidate.years_experience as number | null);
  const jobLevel = (job.experience_level as string) || inferJobExperienceLevel(job, company);
  return experienceLevelsCompatible(userLevel, jobLevel) ? SCORE_WEIGHTS.experience : 0;
}

function locationScore(candidate: Record<string, unknown>, job: Record<string, unknown>, prefs: ReturnType<typeof normalizeJobPreferences>) {
  const jobCity = normalizeText(job.city);
  const jobCountry = normalizeText(job.country || (job.company_profiles as Record<string, unknown> | undefined)?.country);
  const candidateCity = normalizeText(candidate.city);
  const candidateCountry = normalizeText(candidate.country);
  const preferredLocations = prefs.preferred_locations.map(normalizeText);

  if (jobCity && (preferredLocations.includes(jobCity) || candidateCity === jobCity)) return SCORE_WEIGHTS.location;
  if (jobCountry && candidateCountry && jobCountry === candidateCountry) return Math.round(SCORE_WEIGHTS.location * 0.6);
  return 0;
}

function workModeScore(job: Record<string, unknown>, prefs: ReturnType<typeof normalizeJobPreferences>) {
  let score = 0;
  if (prefs.preferred_work_modes.includes(String(job.work_mode))) score += 6;
  if (prefs.preferred_job_types.includes(String(job.job_type))) score += 4;
  return Math.min(SCORE_WEIGHTS.workMode, score);
}

function preferenceScore(candidate: Record<string, unknown>, job: Record<string, unknown>, company: Record<string, unknown> | null, prefs: ReturnType<typeof normalizeJobPreferences>) {
  let score = 0;
  const sector = (job.sector || company?.sector) as string | undefined;
  if (sector && prefs.preferred_categories.includes(sector)) score += 3;

  const expectedSalary = extractSalaryNumber(prefs.expected_salary);
  const jobSalary = extractSalaryNumber(job.salary);
  if (job.salary_negotiable || (expectedSalary && jobSalary && jobSalary >= expectedSalary)) score += 2;

  const candidateLanguages = new Set([
    ...(((candidate.languages as Array<{ language: string }>) ?? []).map((item) => item.language)),
    ...prefs.languages,
  ].filter(Boolean).map(normalizeText));
  const requiredLanguages = asList(job.required_languages).map(normalizeText);
  if (requiredLanguages.length && requiredLanguages.some((language) => candidateLanguages.has(language))) score += 2;

  const userEducationLevel = prefs.education_level || ((candidate.education as Array<Record<string, string>>) ?? [])
    .map((item) => [item.degree, item.field, item.program, item.grade, item.institution].filter(Boolean).join(' '))
    .map(inferEducationLevelFromText)
    .find(Boolean) || null;
  const requiredEducation = (job.education_level as string) || inferEducationLevelFromText(job.description);
  if (educationMeetsRequirement(userEducationLevel, requiredEducation)) score += 2;
  if (prefs.availability === 'immediate' && !job.application_deadline) score += 1;

  return Math.min(3, score);
}

function recentActivityScore(candidate: Record<string, unknown>, job: Record<string, unknown>, company: Record<string, unknown> | null) {
  let score = 0;
  const followed = (candidate.followed_company_ids as string[] | undefined) ?? [];
  if (followed.includes(String(job.company_id))) score += 3;

  const history = (candidate.application_history as Array<Record<string, unknown>> | undefined) ?? [];
  const sector = (job.sector || company?.sector) as string | undefined;
  const jobKeywords = extractJobKeywords(job, company);
  const related = history.some((application) => {
    const appliedSector = application.company_sector as string | undefined;
    const appliedTitle = String(application.job_title ?? '');
    return (sector && appliedSector === sector) || jobKeywords.some((keyword) => tokenize(appliedTitle).includes(keyword));
  });
  if (related) score += 2;

  return Math.min(SCORE_WEIGHTS.recentActivity, score);
}

function calculateJobMatch(candidate: Record<string, unknown>, job: Record<string, unknown>, company: Record<string, unknown> | null) {
  const prefs = normalizeJobPreferences(candidate.job_preferences as Record<string, unknown>);
  let score = 0;

  score += skillScore(candidate, job, company);
  score += experienceScore(candidate, job, company);
  score += locationScore(candidate, job, prefs);
  score += workModeScore(job, prefs);
  score += preferenceScore(candidate, job, company, prefs);
  score += recentActivityScore(candidate, job, company);
  return Math.min(100, Math.max(0, score));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ error: 'Supabase no configurado' }, 500);
  }

  if (!authHeader) {
    return jsonResponse({ error: 'No autorizado' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const callerId = authData.user?.id;

  if (authError || !callerId) {
    return jsonResponse({ error: 'No autorizado' }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { job_id: jobId } = await req.json();
  if (!jobId) {
    return jsonResponse({ error: 'job_id required' }, 400);
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*, company_profiles(company_name, sector, country)')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return jsonResponse({ error: 'Job not found' }, 404);
  }

  if (job.company_id !== callerId) {
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .maybeSingle();

    if (role?.role !== 'admin') {
      return jsonResponse({ error: 'No autorizado' }, 403);
    }
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from('candidate_profiles')
    .select('user_id, headline, about, city, country, years_experience, job_preferences, notification_frequency, skills(name), experience(position), education(institution, program, grade), languages(language, level)')
    .eq('notifications_enabled', true)
    .eq('setup_complete', true);

  if (candidatesError) {
    return jsonResponse({ error: 'No se pudieron cargar candidatos elegibles' }, 500);
  }

  const candidateIds = (candidates ?? []).map((candidate) => candidate.user_id).filter(Boolean);
  const [{ data: follows }, { data: applications }] = await Promise.all([
    candidateIds.length
      ? supabase
          .from('follows')
          .select('user_id, target_id')
          .in('user_id', candidateIds)
          .eq('target_type', 'company')
      : Promise.resolve({ data: [] }),
    candidateIds.length
      ? supabase
          .from('applications')
          .select('candidate_id, jobs(title, company_profiles(sector))')
          .in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const followsByUser = new Map<string, string[]>();
  for (const follow of follows ?? []) {
    const current = followsByUser.get(follow.user_id) ?? [];
    current.push(follow.target_id);
    followsByUser.set(follow.user_id, current);
  }

  const applicationsByUser = new Map<string, Array<Record<string, unknown>>>();
  for (const application of applications ?? []) {
    const current = applicationsByUser.get(application.candidate_id) ?? [];
    current.push({
      job_title: application.jobs?.title,
      company_sector: application.jobs?.company_profiles?.sector,
    });
    applicationsByUser.set(application.candidate_id, current);
  }

  const company = job.company_profiles as Record<string, unknown> | null;
  const matches = (candidates ?? [])
    .map((candidate) => {
      const enrichedCandidate = {
        ...candidate,
        followed_company_ids: followsByUser.get(candidate.user_id) ?? [],
        application_history: applicationsByUser.get(candidate.user_id) ?? [],
      };

      return {
        user_id: candidate.user_id,
        score: calculateJobMatch(enrichedCandidate, job, company),
      };
    })
    .filter((item) => item.score >= MATCH_THRESHOLD);

  if (!matches.length) {
    return jsonResponse({ in_app_count: 0, push_recipient_ids: [] });
  }

  const { data: notifyResult, error: notifyError } = await supabase.rpc('notify_job_recommendations', {
    p_job_id: jobId,
    p_matches: matches.map(({ user_id, score }) => ({ user_id, score })),
  });

  if (notifyError) {
    return jsonResponse({ error: 'No se pudieron crear recomendaciones' }, 500);
  }

  return jsonResponse(notifyResult ?? { in_app_count: 0, push_recipient_ids: [] });
});
