import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SCORE_WEIGHTS = {
  category: 35,
  location: 25,
  jobType: 15,
  experience: 15,
  keywords: 10,
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
    preferred_job_types: Array.isArray(raw?.preferred_job_types) ? raw!.preferred_job_types.filter(Boolean) : [],
    preferred_categories: preferredCategories as string[],
    keywords: Array.isArray(raw?.keywords) ? raw!.keywords.filter(Boolean) : [],
    experience_level: (raw?.experience_level as string) || null,
  };
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
  return [...new Set(tokenize([candidate.headline, candidate.about, ...skills, ...experience, ...prefs.keywords].join(' ')))];
}

function extractJobKeywords(job: Record<string, unknown>, company: Record<string, unknown> | null) {
  const requirements = parseRequirements(job.requirements);
  return [...new Set(tokenize([job.title, job.description, requirements.join(' '), company?.sector].join(' ')))];
}

function keywordOverlapScore(userKeywords: string[], jobKeywords: string[]) {
  if (!userKeywords.length || !jobKeywords.length) return 0;
  const jobSet = new Set(jobKeywords);
  const matches = userKeywords.filter((keyword) => jobSet.has(keyword)).length;
  const ratio = matches / Math.max(userKeywords.length, 1);
  return Math.round(Math.min(1, ratio * 2) * SCORE_WEIGHTS.keywords);
}

function calculateJobMatch(candidate: Record<string, unknown>, job: Record<string, unknown>, company: Record<string, unknown> | null) {
  const prefs = normalizeJobPreferences(candidate.job_preferences as Record<string, unknown>);
  let score = 0;

  const sector = company?.sector as string | undefined;
  if (prefs.preferred_categories.length && sector && prefs.preferred_categories.includes(sector)) {
    score += SCORE_WEIGHTS.category;
  }

  if (prefs.preferred_locations.length && job.city && prefs.preferred_locations.includes(String(job.city))) {
    score += SCORE_WEIGHTS.location;
  }

  if (prefs.preferred_job_types.length && job.job_type && prefs.preferred_job_types.includes(String(job.job_type))) {
    score += SCORE_WEIGHTS.jobType;
  }

  const userLevel = prefs.experience_level || inferExperienceLevelFromYears(candidate.years_experience as number | null);
  const jobLevel = inferJobExperienceLevel(job, company);
  if (experienceLevelsCompatible(userLevel, jobLevel)) {
    score += SCORE_WEIGHTS.experience;
  }

  score += keywordOverlapScore(extractUserKeywords(candidate), extractJobKeywords(job, company));
  return Math.min(100, Math.max(0, score));
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { job_id: jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'job_id required' }), { status: 400 });
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*, company_profiles(company_name, sector)')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from('candidate_profiles')
    .select('user_id, headline, about, years_experience, job_preferences, notification_frequency, onesignal_player_id, skills(name), experience(position)')
    .eq('notifications_enabled', true)
    .eq('setup_complete', true);

  if (candidatesError) {
    return new Response(JSON.stringify({ error: candidatesError.message }), { status: 500 });
  }

  const company = job.company_profiles as Record<string, unknown> | null;
  const matches = (candidates ?? [])
    .map((candidate) => ({
      user_id: candidate.user_id,
      score: calculateJobMatch(candidate, job, company),
      player_id: candidate.onesignal_player_id,
    }))
    .filter((item) => item.score >= MATCH_THRESHOLD);

  if (!matches.length) {
    return new Response(JSON.stringify({ in_app_count: 0, push_recipient_ids: [], player_ids_by_user: {} }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: notifyResult, error: notifyError } = await supabase.rpc('notify_job_recommendations', {
    p_job_id: jobId,
    p_matches: matches.map(({ user_id, score }) => ({ user_id, score })),
  });

  if (notifyError) {
    return new Response(JSON.stringify({ error: notifyError.message }), { status: 500 });
  }

  const pushIds: string[] = notifyResult?.push_recipient_ids ?? [];
  const playerIdsByUser: Record<string, string> = {};
  for (const match of matches) {
    if (pushIds.includes(match.user_id) && match.player_id) {
      playerIdsByUser[match.user_id] = String(match.player_id);
    }
  }

  return new Response(
    JSON.stringify({
      ...notifyResult,
      player_ids_by_user: playerIdsByUser,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
