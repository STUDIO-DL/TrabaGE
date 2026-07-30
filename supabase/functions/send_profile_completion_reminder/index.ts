import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  formatResendError,
  getResendAuthFromAddress,
  sendViaResend,
} from '../_shared/resend.ts';
import type { ReminderAccountType } from './constants.ts';
import {
  buildProfileReminderContent,
  buildProfileReminderHtml,
  buildProfileReminderText,
  PROFILE_REMINDER_SUBJECT,
} from './emailTemplate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-profile-reminder-secret',
  Vary: 'Origin',
};

type ReminderRow = {
  id: string;
  user_id: string;
  reminder_kind: string;
  status: string;
  account_type: ReminderAccountType | null;
  email: string | null;
  retry_count: number;
  max_retries: number;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isAuthorizedWebhook(req: Request) {
  const expected = Deno.env.get('PROFILE_COMPLETION_REMINDER_SECRET')?.trim()
    || Deno.env.get('PROFILE_REMINDER_WEBHOOK_SECRET')?.trim();
  if (!expected) return false;
  return req.headers.get('x-profile-reminder-secret') === expected;
}

function isAuthorizedServiceRole(req: Request, serviceRoleKey: string) {
  const authHeader = req.headers.get('Authorization') ?? '';
  return authHeader === `Bearer ${serviceRoleKey}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAccountReady(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  banned_until?: string | null;
  app_metadata?: { provider?: string; providers?: string[] };
}) {
  if (user.banned_until) {
    const until = Date.parse(user.banned_until);
    if (!Number.isNaN(until) && until > Date.now()) return false;
  }

  if (!user.email || !isValidEmail(user.email)) return false;

  if (user.email_confirmed_at || user.confirmed_at) return true;

  const provider = user.app_metadata?.provider
    ?? user.app_metadata?.providers?.[0]
    ?? '';

  return provider !== '' && provider !== 'email';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? '').trim()).filter(Boolean);
}

function normalizeAccountType(value: unknown): ReminderAccountType {
  const raw = String(value ?? '').toLowerCase().trim();
  if (raw === 'business' || raw === 'organization' || raw === 'personal') return raw;
  return 'personal';
}

async function logReminderEvent(
  admin: SupabaseClient,
  details: {
    userId: string;
    reminderId: string;
    status: 'sent' | 'failed' | 'skipped' | 'cancelled';
    email?: string | null;
    accountType?: string | null;
    profileCompletion?: number | null;
    missingSections?: string[] | null;
    errorMessage?: string | null;
  },
) {
  try {
    await admin.from('profile_completion_reminder_logs').insert({
      user_id: details.userId,
      reminder_id: details.reminderId,
      status: details.status,
      email: details.email ?? null,
      account_type: details.accountType ?? null,
      profile_completion: details.profileCompletion ?? null,
      missing_sections: details.missingSections ?? null,
      error_message: details.errorMessage ?? null,
    });
  } catch (logError) {
    console.error('[send_profile_completion_reminder] log error:', logError);
  }
}

async function markReminder(
  admin: SupabaseClient,
  reminderId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from('profile_completion_reminders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', reminderId);

  if (error) {
    console.error('[send_profile_completion_reminder] update error:', error.message);
  }
}

async function isProfileActive(admin: SupabaseClient, userId: string, accountType: ReminderAccountType) {
  if (accountType === 'personal') {
    const { data } = await admin
      .from('candidate_profiles')
      .select('is_active')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.is_active !== false;
  }

  const { data } = await admin
    .from('company_profiles')
    .select('is_active')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.is_active !== false;
}

async function allowsSystemEmails(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from('notification_preferences')
    .select('system_updates')
    .eq('user_id', userId)
    .maybeSingle();

  // Missing row → treat as default (system_updates = true).
  if (!data) return true;
  return data.system_updates !== false;
}

async function resolveDisplayName(
  admin: SupabaseClient,
  userId: string,
  accountType: ReminderAccountType,
  authName: string,
) {
  if (authName) return authName;

  if (accountType === 'personal') {
    const { data } = await admin
      .from('candidate_profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();
    return String(data?.full_name ?? '').trim();
  }

  const { data } = await admin
    .from('company_profiles')
    .select('company_name')
    .eq('user_id', userId)
    .maybeSingle();
  return String(data?.company_name ?? '').trim();
}

async function processReminder(admin: SupabaseClient, reminder: ReminderRow) {
  const userId = reminder.user_id;

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    await markReminder(admin, reminder.id, {
      status: 'cancelled',
      cancelled_reason: 'user_not_found',
      last_error: 'Usuario no encontrado',
    });
    await logReminderEvent(admin, {
      userId,
      reminderId: reminder.id,
      status: 'cancelled',
      errorMessage: 'user_not_found',
    });
    return { outcome: 'cancelled', reason: 'user_not_found' };
  }

  const user = userData.user;
  const email = String(reminder.email || user.email || '').trim();

  if (!isAccountReady(user) || !isValidEmail(email)) {
    await markReminder(admin, reminder.id, {
      status: 'cancelled',
      cancelled_reason: 'account_not_eligible',
      last_error: 'Cuenta no elegible o email inválido',
      email: email || null,
    });
    await logReminderEvent(admin, {
      userId,
      reminderId: reminder.id,
      status: 'cancelled',
      email,
      errorMessage: 'account_not_eligible',
    });
    return { outcome: 'cancelled', reason: 'account_not_eligible' };
  }

  if (!(await allowsSystemEmails(admin, userId))) {
    await markReminder(admin, reminder.id, {
      status: 'cancelled',
      cancelled_reason: 'system_updates_disabled',
      email,
    });
    await logReminderEvent(admin, {
      userId,
      reminderId: reminder.id,
      status: 'cancelled',
      email,
      errorMessage: 'system_updates_disabled',
    });
    return { outcome: 'cancelled', reason: 'system_updates_disabled' };
  }

  const { data: completion, error: completionError } = await admin.rpc('get_profile_completion', {
    p_user_id: userId,
  });

  if (completionError) {
    const message = completionError.message;
    console.error('[send_profile_completion_reminder] completion error:', message);
    await markReminder(admin, reminder.id, {
      status: 'failed',
      retry_count: (reminder.retry_count ?? 0) + 1,
      last_error: message,
      last_attempt_at: new Date().toISOString(),
    });
    await logReminderEvent(admin, {
      userId,
      reminderId: reminder.id,
      status: 'failed',
      email,
      errorMessage: message,
    });
    return { outcome: 'failed', reason: 'completion_error' };
  }

  const accountType = normalizeAccountType(completion?.account_type ?? reminder.account_type);
  const percent = Number(completion?.percent ?? 0);
  const sufficient = Boolean(completion?.sufficient);
  const missingSections = asStringArray(completion?.missing_sections);
  const completedSections = asStringArray(completion?.completed_sections);

  if (!(await isProfileActive(admin, userId, accountType))) {
    await markReminder(admin, reminder.id, {
      status: 'cancelled',
      cancelled_reason: 'account_inactive',
      account_type: accountType,
      email,
      profile_completion: percent,
      missing_sections: missingSections,
      completed_sections: completedSections,
    });
    await logReminderEvent(admin, {
      userId,
      reminderId: reminder.id,
      status: 'cancelled',
      email,
      accountType,
      profileCompletion: percent,
      missingSections,
      errorMessage: 'account_inactive',
    });
    return { outcome: 'cancelled', reason: 'account_inactive' };
  }

  // Re-check live completeness immediately before send.
  if (sufficient) {
    await markReminder(admin, reminder.id, {
      status: 'cancelled',
      cancelled_reason: 'profile_sufficient',
      account_type: accountType,
      email,
      profile_completion: percent,
      missing_sections: missingSections,
      completed_sections: completedSections,
    });
    await logReminderEvent(admin, {
      userId,
      reminderId: reminder.id,
      status: 'cancelled',
      email,
      accountType,
      profileCompletion: percent,
      missingSections,
      errorMessage: 'profile_sufficient',
    });
    return { outcome: 'cancelled', reason: 'profile_sufficient', percent };
  }

  const authName = String(
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
  ).trim();
  const displayName = await resolveDisplayName(admin, userId, accountType, authName);
  const content = buildProfileReminderContent(displayName, accountType, percent, missingSections);

  try {
    await sendViaResend({
      from: getResendAuthFromAddress(),
      to: email,
      subject: PROFILE_REMINDER_SUBJECT,
      html: buildProfileReminderHtml(content),
      text: buildProfileReminderText(content),
    });
  } catch (sendError) {
    const errorMessage = formatResendError(sendError);
    console.error('[send_profile_completion_reminder] Resend error:', errorMessage);
    await markReminder(admin, reminder.id, {
      status: 'failed',
      retry_count: (reminder.retry_count ?? 0) + 1,
      last_error: errorMessage,
      last_attempt_at: new Date().toISOString(),
      account_type: accountType,
      email,
      profile_completion: percent,
      missing_sections: missingSections,
      completed_sections: completedSections,
    });
    await logReminderEvent(admin, {
      userId,
      reminderId: reminder.id,
      status: 'failed',
      email,
      accountType,
      profileCompletion: percent,
      missingSections,
      errorMessage,
    });
    return { outcome: 'failed', reason: 'resend_error' };
  }

  await markReminder(admin, reminder.id, {
    status: 'sent',
    sent_at: new Date().toISOString(),
    last_error: null,
    account_type: accountType,
    email,
    profile_completion: percent,
    missing_sections: missingSections,
    completed_sections: completedSections,
  });
  await logReminderEvent(admin, {
    userId,
    reminderId: reminder.id,
    status: 'sent',
    email,
    accountType,
    profileCompletion: percent,
    missingSections,
  });

  console.log(
    '[send_profile_completion_reminder] sent:',
    userId,
    email,
    accountType,
    `percent=${percent}`,
  );

  return { outcome: 'sent', percent, accountType };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase no configurado' }, 500);
    }

    if (!isAuthorizedWebhook(req) && !isAuthorizedServiceRole(req, serviceRoleKey)) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const limit = Math.min(Math.max(Number(payload.limit ?? 20) || 20, 1), 50);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: claimed, error: claimError } = await admin.rpc(
      'claim_profile_completion_reminders',
      { p_limit: limit },
    );

    if (claimError) {
      console.error('[send_profile_completion_reminder] claim error:', claimError.message);
      return jsonResponse({ error: 'No se pudo reclamar la cola' }, 500);
    }

    const rows = (claimed ?? []) as ReminderRow[];
    if (rows.length === 0) {
      return jsonResponse({ ok: true, claimed: 0, results: [] });
    }

    const results = [];
    for (const row of rows) {
      try {
        const result = await processReminder(admin, row);
        results.push({ id: row.id, user_id: row.user_id, ...result });
      } catch (error) {
        const message = formatResendError(error);
        console.error('[send_profile_completion_reminder] unexpected row error:', message);
        await markReminder(admin, row.id, {
          status: 'failed',
          retry_count: (row.retry_count ?? 0) + 1,
          last_error: message,
          last_attempt_at: new Date().toISOString(),
        });
        await logReminderEvent(admin, {
          userId: row.user_id,
          reminderId: row.id,
          status: 'failed',
          email: row.email,
          errorMessage: message,
        });
        results.push({ id: row.id, user_id: row.user_id, outcome: 'failed', reason: 'unexpected' });
      }
    }

    return jsonResponse({
      ok: true,
      claimed: rows.length,
      results,
    });
  } catch (error) {
    console.error('[send_profile_completion_reminder] unexpected:', error);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});
