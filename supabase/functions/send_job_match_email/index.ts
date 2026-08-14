import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  formatResendError,
  isResendConfigured,
  sendViaResend,
  getResendAuthFromAddress,
} from '../_shared/resend.ts';
import { buildJobMatchHtml, buildJobMatchText, buildJobMatchSubject } from './templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trabage-service-role, x-service-role',
  Vary: 'Origin',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'supabase_not_configured' }, 500);

  // Accept either standard Authorization: Bearer <token> OR a custom
  // internal header (x-trabage-service-role / x-service-role) to avoid
  // the gateway treating the value as a JWT. We compare the raw token
  // value to the service role key stored in secrets.
  let authHeader = req.headers.get('authorization') ?? '';
  const customHeader = req.headers.get('x-trabage-service-role') ?? req.headers.get('x-service-role') ?? '';
  if (!authHeader && customHeader) authHeader = customHeader;

  // Normalize: if header uses "Bearer <token>", extract token part.
  let providedToken = authHeader || '';
  if (providedToken.toLowerCase().startsWith('bearer ')) {
    providedToken = providedToken.slice(7).trim();
  }

  const trusted = providedToken === serviceRoleKey;
  if (!trusted) return jsonResponse({ error: 'unauthorized' }, 401);

  if (!isResendConfigured()) {
    return jsonResponse({ error: 'email_provider_not_configured' }, 503);
  }

  let payload: { user_id?: string; job_id?: string; notification_id?: string } = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const { user_id: userId, job_id: jobId, notification_id: notificationId } = payload;
  if (!userId || !jobId) return jsonResponse({ error: 'missing_parameters' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Resolve user (auth.users) and candidate profile/preferences
  try {
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !userData?.user) return jsonResponse({ error: 'user_not_found' }, 404);

    const user = userData.user;
    const email = String(user.email ?? '').trim();
    if (!isValidEmail(email)) return jsonResponse({ ok: true, sent: false, reason: 'invalid_email' }, 200);

    // Fetch candidate profile notification settings
    const { data: prefRow } = await admin
      .from('candidate_profiles')
      .select('notifications_enabled, notification_frequency')
      .eq('user_id', userId)
      .maybeSingle();

    if (!prefRow || prefRow.notifications_enabled === false) {
      return jsonResponse({ ok: true, sent: false, reason: 'notifications_disabled' }, 200);
    }

    const notifFrequency = String(prefRow.notification_frequency ?? 'instant');

    // Re-check explicit per-category preference
    const { data: np } = await admin
      .from('notification_preferences')
      .select('employment_new_jobs')
      .eq('user_id', userId)
      .maybeSingle();

    if (np && np.employment_new_jobs === false) {
      return jsonResponse({ ok: true, sent: false, reason: 'category_disabled' }, 200);
    }

    // Idempotency: check recommendation_analytics for prior email send
    const { data: existing } = await admin
      .from('recommendation_analytics')
      .select('id')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .eq('event_type', 'notification_sent')
      .filter('metadata', 'contains', JSON.stringify({ channel: 'email' }))
      .limit(1);

    if (existing && existing.length) {
      return jsonResponse({ ok: true, sent: false, reason: 'already_sent' }, 200);
    }

    // Only send immediate emails for 'instant' frequency. Non-instant are batched elsewhere.
    if (notifFrequency !== 'instant') {
      return jsonResponse({ ok: true, sent: false, reason: 'frequency_not_instant' }, 200);
    }

    // Fetch job details including publisher (candidate_profiles) and company profile
    const { data: jobRow, error: jobErr } = await admin
      .from('jobs')
      .select('id, title, description, city, country, work_mode, job_type, source_type, company_profiles(company_name), publisher:candidate_profiles!jobs_shared_by_user_id_fkey(full_name)')
      .eq('id', jobId)
      .maybeSingle();

    if (jobErr || !jobRow) return jsonResponse({ error: 'job_not_found' }, 404);

    const jobTitle = String(jobRow.title ?? '').trim();
    const company = String(jobRow.company_profiles?.company_name ?? '').trim();
    const location = [jobRow.city, jobRow.country].filter(Boolean).join(', ');
    const modality = String(jobRow.work_mode ?? jobRow.job_type ?? '').trim();
    const url = `${Deno.env.get('TRABAGE_PUBLIC_URL') ?? 'https://trabage.org'}/personal/jobs/${jobId}`;

    // Determine source type and publisher name from job row to decide display in email
    const sourceType = jobRow.source_type ?? (jobRow.publisher ? 'user' : 'company');
    const publisherName = (jobRow.publisher?.full_name) || null;

    const subject = buildJobMatchSubject(jobTitle, { sourceType, company, publisherName });
    const html = buildJobMatchHtml({
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      jobTitle,
      company,
      location,
      modality,
      url,
      sourceType,
      publisherName,
    });
    const text = buildJobMatchText({
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      jobTitle,
      company,
      location,
      modality,
      url,
      sourceType,
      publisherName,
    });

    // Mark analytics entry BEFORE send to aid idempotency (we'll update if failed)
    const { data: trackData, error: trackError } = await admin
      .from('recommendation_analytics')
      .insert([{ user_id: userId, job_id: jobId, event_type: 'notification_sent', metadata: { channel: 'email', notification_id: notificationId ?? null }, }])
      .select('*');

    if (trackError) {
      console.error('[send_job_match_email] analytics_insert_error', trackError.message);
    }

    // Send email via Resend
    try {
      const providerResponse = await sendViaResend({
        from: getResendAuthFromAddress(),
        to: email,
        subject,
        html,
        text,
      });

      // Optionally store provider response status in analytics
      try {
        await admin
          .from('recommendation_analytics')
          .insert([{ user_id: userId, job_id: jobId, event_type: 'notification_opened', metadata: { channel: 'email', provider_response: providerResponse ?? null } }]);
      } catch (e) {
        console.error('[send_job_match_email] analytics_post_send_error', e);
      }

      console.log('[send_job_match_email] sent', { userId, jobId, notificationId });
      return jsonResponse({ ok: true, sent: true });
    } catch (sendErr) {
      const message = formatResendError(sendErr);
      console.error('[send_job_match_email] resend_error', message);

      // mark failed in analytics
      try {
        await admin
          .from('recommendation_analytics')
          .insert([{ user_id: userId, job_id: jobId, event_type: 'notification_sent', metadata: { channel: 'email', status: 'failed', error: message, notification_id: notificationId ?? null } }]);
      } catch (e) {
        console.error('[send_job_match_email] analytics_fail_log_error', e);
      }

      return jsonResponse({ error: 'email_send_failed', message }, 502);
    }
  } catch (err) {
    console.error('[send_job_match_email] unexpected', err);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
});
