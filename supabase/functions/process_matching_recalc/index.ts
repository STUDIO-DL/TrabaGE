import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  Vary: 'Origin',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Supabase no configurado' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { limit = 25 } = await req.json().catch(() => ({ limit: 25 }));

  const { data: events, error: claimError } = await supabase.rpc('claim_recommendation_recalc_batch', {
    p_limit: limit,
  });

  if (claimError) {
    return jsonResponse({ error: claimError.message }, 500);
  }

  let processed = 0;
  const errors: string[] = [];

  for (const event of events ?? []) {
    try {
      if (event.subject_type === 'candidate') {
        const { error } = await recalculateForCandidate(supabase, event.subject_id);
        if (error) errors.push(error.message);
        else processed += 1;
      } else if (event.subject_type === 'job') {
        const { error } = await recalculateForJob(supabase, event.subject_id);
        if (error) errors.push(error.message);
        else processed += 1;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return jsonResponse({
    claimed: events?.length ?? 0,
    processed,
    errors,
    weights: SCORE_WEIGHTS,
    threshold: MATCH_THRESHOLD,
  });
});

async function recalculateForCandidate(supabase: ReturnType<typeof createClient>, userId: string) {
  const [profileResult, jobsResult] = await Promise.all([
    supabase
      .from('candidate_profiles')
      .select('user_id, headline, about, city, province, country, years_experience, expected_salary, job_preferences, skills(name), experience(position), education(institution, program, grade), languages(language, level)')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('jobs')
      .select('*, company_profiles(sector, country)')
      .eq('status', 'active'),
  ]);

  if (profileResult.error) return { error: profileResult.error };
  if (!profileResult.data) return { error: null };
  if (jobsResult.error) return { error: jobsResult.error };

  const matches = (jobsResult.data ?? [])
    .map((job) => ({
      user_id: userId,
      job_id: job.id,
      score: scoreJob(profileResult.data, job),
    }))
    .filter((item) => item.score > 0);

  if (!matches.length) return { error: null };

  const { error } = await supabase.rpc('upsert_job_matches', { p_matches: matches });
  return { error };
}

async function recalculateForJob(supabase: ReturnType<typeof createClient>, jobId: string) {
  const [jobResult, candidatesResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('*, company_profiles(sector, country)')
      .eq('id', jobId)
      .maybeSingle(),
    supabase
      .from('candidate_profiles')
      .select('user_id, headline, about, city, province, country, years_experience, expected_salary, job_preferences, skills(name), experience(position), education(institution, program, grade), languages(language, level)')
      .eq('is_active', true)
      .eq('setup_complete', true),
  ]);

  if (jobResult.error) return { error: jobResult.error };
  if (!jobResult.data) return { error: null };
  if (candidatesResult.error) return { error: candidatesResult.error };

  const job = jobResult.data;
  const jobMatches = (candidatesResult.data ?? [])
    .map((candidate) => ({
      user_id: candidate.user_id,
      job_id: jobId,
      score: scoreJob(candidate, job),
    }))
    .filter((item) => item.score >= MATCH_THRESHOLD);

  if (jobMatches.length) {
    await supabase.rpc('upsert_job_matches', { p_matches: jobMatches });
  }

  const candidateMatches = (candidatesResult.data ?? [])
    .map((candidate) => ({
      job_id: jobId,
      candidate_id: candidate.user_id,
      score: scoreJob(candidate, job),
    }))
    .filter((item) => item.score > 0);

  if (candidateMatches.length) {
    await supabase.rpc('upsert_job_candidate_matches', { p_matches: candidateMatches });
  }

  return { error: null };
}

function scoreJob(candidate: Record<string, unknown>, job: Record<string, unknown>) {
  const prefs = normalizeJobPreferences(candidate.job_preferences as Record<string, unknown>);
  let score = 0;

  score += roleScore(candidate, job);
  score += skillScore(candidate, job);
  score += experienceScore(candidate, job);
  score += locationScore(candidate, job, prefs);
  score += workModeScore(job, prefs);
  score += availabilityScore(candidate, job, prefs);
  score += languageScore(candidate, job, prefs);
  score += educationScore(candidate, job, prefs);

  return Math.min(100, Math.max(0, score));
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9áéíóúñ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function normalizeJobPreferences(raw: Record<string, unknown> | null | undefined) {
  return {
    preferred_locations: Array.isArray(raw?.preferred_locations) ? raw!.preferred_locations : [],
    preferred_work_modes: Array.isArray(raw?.preferred_work_modes) ? raw!.preferred_work_modes : [],
    preferred_job_types: Array.isArray(raw?.preferred_job_types) ? raw!.preferred_job_types : [],
    preferred_categories: Array.isArray(raw?.preferred_categories) ? raw!.preferred_categories : [],
    keywords: Array.isArray(raw?.keywords) ? raw!.keywords : [],
    experience_level: (raw?.experience_level as string) || null,
    availability: (raw?.availability as string) || null,
    education_level: (raw?.education_level as string) || null,
    languages: Array.isArray(raw?.languages) ? raw!.languages : [],
  };
}

function scoreRatio(matches: number, total: number, weight: number) {
  if (!total) return 0;
  return Math.round(Math.min(1, matches / total) * weight);
}

function roleScore(candidate: Record<string, unknown>, job: Record<string, unknown>) {
  const userTokens = tokenize([candidate.headline, ...((candidate.experience as Array<{ position: string }>) ?? []).map((item) => item.position)].join(' '));
  const jobTokens = tokenize([job.title, job.category, job.sector].filter(Boolean).join(' '));
  if (!userTokens.length || !jobTokens.length) return 0;
  const matches = userTokens.filter((token) => jobTokens.includes(token)).length;
  return scoreRatio(matches, Math.max(jobTokens.length, 1), SCORE_WEIGHTS.role);
}

function skillScore(candidate: Record<string, unknown>, job: Record<string, unknown>) {
  const userSkills = tokenize(((candidate.skills as Array<{ name: string }>) ?? []).map((item) => item.name).join(' '));
  const jobSkills = tokenize([...(job.required_skills as string[] ?? []), job.title, job.description].join(' '));
  if (!userSkills.length || !jobSkills.length) return 0;
  const matches = userSkills.filter((skill) => jobSkills.includes(skill)).length;
  return scoreRatio(matches, Math.max(jobSkills.length, 1), SCORE_WEIGHTS.skills);
}

function experienceScore(candidate: Record<string, unknown>, job: Record<string, unknown>) {
  const years = Number(candidate.years_experience ?? 0);
  const userLevel = years <= 0 ? 'none' : years <= 2 ? 'junior' : years <= 5 ? 'mid' : 'senior';
  const jobLevel = (job.experience_level as string) || null;
  if (!jobLevel) return 0;
  const order = ['none', 'junior', 'mid', 'senior'];
  return order.indexOf(userLevel) >= order.indexOf(jobLevel) ? SCORE_WEIGHTS.experience : 0;
}

function locationScore(candidate: Record<string, unknown>, job: Record<string, unknown>, prefs: ReturnType<typeof normalizeJobPreferences>) {
  if (job.work_mode === 'remote') return Math.round(SCORE_WEIGHTS.location * 0.2);
  const jobCity = normalizeText(job.city);
  const candidateCity = normalizeText(candidate.city);
  const preferred = prefs.preferred_locations.map(normalizeText);
  if (jobCity && (preferred.includes(jobCity) || candidateCity === jobCity)) return SCORE_WEIGHTS.location;
  if (normalizeText(job.country) && normalizeText(candidate.country) === normalizeText(job.country)) {
    return Math.round(SCORE_WEIGHTS.location * 0.5);
  }
  return 0;
}

function workModeScore(job: Record<string, unknown>, prefs: ReturnType<typeof normalizeJobPreferences>) {
  let score = 0;
  if (prefs.preferred_work_modes.includes(String(job.work_mode))) score += 6;
  if (prefs.preferred_job_types.includes(String(job.job_type))) score += 4;
  return Math.min(SCORE_WEIGHTS.workMode, score);
}

function availabilityScore(_candidate: Record<string, unknown>, job: Record<string, unknown>, prefs: ReturnType<typeof normalizeJobPreferences>) {
  const userAvailability = prefs.availability;
  const jobAvailability = (job.availability_required as string) || 'flexible';
  if (!userAvailability) return 0;
  if (jobAvailability === 'flexible') return Math.round(SCORE_WEIGHTS.availability * 0.6);
  if (userAvailability === jobAvailability) return SCORE_WEIGHTS.availability;
  return 0;
}

function languageScore(candidate: Record<string, unknown>, job: Record<string, unknown>, prefs: ReturnType<typeof normalizeJobPreferences>) {
  const required = ((job.required_languages as string[]) ?? []).map(normalizeText);
  if (!required.length) return 0;
  const userLanguages = new Set([
    ...(((candidate.languages as Array<{ language: string }>) ?? []).map((item) => normalizeText(item.language))),
    ...prefs.languages.map(normalizeText),
  ]);
  const matches = required.filter((language) => userLanguages.has(language)).length;
  return scoreRatio(matches, required.length, SCORE_WEIGHTS.languages);
}

function educationScore(candidate: Record<string, unknown>, job: Record<string, unknown>, prefs: ReturnType<typeof normalizeJobPreferences>) {
  const required = (job.education_level as string) || null;
  if (!required) return 0;
  const userLevel = prefs.education_level;
  if (!userLevel) return 0;
  const order = ['secondary', 'technical', 'degree', 'master'];
  return order.indexOf(userLevel) >= order.indexOf(required) ? SCORE_WEIGHTS.education : 0;
}
