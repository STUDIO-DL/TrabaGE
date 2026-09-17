import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  formatResendError,
  getResendAuthFromAddress,
  isResendConfigured,
  sendViaResend,
} from '../_shared/resend.ts';
import { buildDigestHtml, buildDigestSubject, buildDigestText } from './templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-job-match-digest-secret',
  Vary: 'Origin',
};

type DigestFrequency = 'daily' | 'weekly';

type PendingMatchRow = {
  user_id: string;
  job_id: string;
  score: number | null;
  matched_at: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(authHeader: string) {
  const trimmed = authHeader.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function lookbackHours(frequency: DigestFrequency) {
  return frequency === 'weekly' ? 24 * 7 : 24;
}

async function hasEmailBeenSent(
  admin: ReturnType<typeof createClient>,
  userId: string,
  jobId: string,
) {
  const { data } = await admin
    .from('recommendation_analytics')
    .select('id, metadata')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .eq('event_type', 'notification_sent')
    .filter('metadata', 'contains', JSON.stringify({ channel: 'email' }))
    .limit(5);

  return (data ?? []).some((row) => {
    const status = (row.metadata as Record<string, unknown> | null)?.status;
    return status !== 'failed';
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const digestSecret = Deno.env.get('JOB_MATCH_DIGEST_SECRET')?.trim() ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  const bearer = extractBearerToken(authHeader);
  const headerSecret = req.headers.get('x-job-match-digest-secret')?.trim() ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'supabase_not_configured' }, 500);
  }

  const authorizedByServiceRole = bearer === serviceRoleKey;
  const authorizedBySecret = Boolean(digestSecret) && (
    headerSecret === digestSecret || bearer === digestSecret
  );

  if (!authorizedByServiceRole && !authorizedBySecret) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  if (!isResendConfigured()) {
    return jsonResponse({ error: 'email_provider_not_configured' }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const frequency = body?.frequency === 'weekly' ? 'weekly' : 'daily';
  const userLimit = Math.min(Math.max(Number(body?.limit) || 50, 1), 200);
  const baseUrl = Deno.env.get('TRABAGE_PUBLIC_URL') ?? Deno.env.get('APP_URL') ?? 'https://trabage.org';

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const sinceIso = new Date(Date.now() - lookbackHours(frequency) * 60 * 60 * 1000).toISOString();

  const { data: profiles, error: profilesError } = await admin
    .from('candidate_profiles')
    .select('user_id, notification_frequency, notifications_enabled')
    .eq('notifications_enabled', true)
    .eq('notification_frequency', frequency)
    .limit(userLimit);

  if (profilesError) {
    return jsonResponse({ error: profilesError.message }, 500);
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const profile of profiles ?? []) {
    const userId = profile.user_id as string;
    if (!userId) continue;

    try {
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
      if (userErr || !userData?.user) {
        skipped += 1;
        continue;
      }

      const email = String(userData.user.email ?? '').trim();
      if (!isValidEmail(email)) {
        skipped += 1;
        continue;
      }

      const { data: prefs } = await admin
        .from('notification_preferences')
        .select('employment_new_jobs')
        .eq('user_id', userId)
        .maybeSingle();

      if (prefs && prefs.employment_new_jobs === false) {
        skipped += 1;
        continue;
      }

      const { data: matches, error: matchesError } = await admin
        .from('job_matches')
        .select('user_id, job_id, score, created_at')
        .eq('user_id', userId)
        .gte('created_at', sinceIso)
        .order('score', { ascending: false })
        .limit(20);

      if (matchesError) {
        errors.push(`${userId}: ${matchesError.message}`);
        continue;
      }

      const pending: PendingMatchRow[] = [];
      for (const match of matches ?? []) {
        const alreadySent = await hasEmailBeenSent(admin, userId, match.job_id);
        if (!alreadySent) {
          pending.push({
            user_id: userId,
            job_id: match.job_id,
            score: match.score,
            matched_at: match.created_at,
          });
        }
      }

      if (!pending.length) {
        skipped += 1;
        continue;
      }

      const jobIds = pending.map((row) => row.job_id);
      const { data: jobs, error: jobsError } = await admin
        .from('jobs')
        .select('id, title, city, country, work_mode, source_type, company_profiles(company_name), publisher:candidate_profiles!jobs_shared_by_user_id_fkey(full_name)')
        .in('id', jobIds)
        .eq('status', 'active');

      if (jobsError || !jobs?.length) {
        skipped += 1;
        continue;
      }

      const scoreByJob = new Map(pending.map((row) => [row.job_id, row.score]));
      const digestJobs = jobs.map((job) => ({
        id: job.id,
        title: String(job.title ?? ''),
        city: job.city,
        country: job.country,
        work_mode: job.work_mode,
        source_type: job.source_type,
        company_name: job.company_profiles?.company_name ?? null,
        publisher_name: job.publisher?.full_name ?? null,
        score: scoreByJob.get(job.id) ?? null,
      }));

      const name = String(
        userData.user.user_metadata?.full_name
        ?? userData.user.user_metadata?.name
        ?? '',
      ).trim();

      const subject = buildDigestSubject(frequency, digestJobs.length);
      const html = buildDigestHtml({ name, frequency, jobs: digestJobs, baseUrl });
      const text = buildDigestText({ name, frequency, jobs: digestJobs, baseUrl });

      try {
        await sendViaResend({
          from: getResendAuthFromAddress(),
          to: email,
          subject,
          html,
          text,
        });

        for (const job of digestJobs) {
          await admin.from('recommendation_analytics').insert({
            user_id: userId,
            job_id: job.id,
            event_type: 'notification_sent',
            metadata: {
              channel: 'email',
              frequency,
              digest: true,
            },
          });
        }

        sent += 1;
      } catch (sendErr) {
        errors.push(`${userId}: ${formatResendError(sendErr)}`);
      }
    } catch (err) {
      errors.push(`${profile.user_id}: ${String(err)}`);
    }
  }

  return jsonResponse({
    ok: true,
    frequency,
    sent,
    skipped,
    errors,
  });
});
