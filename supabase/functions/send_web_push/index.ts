import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  buildWebPushPayload,
  isVapidConfigured,
  loadWebPushSubscriptionsForUsers,
  resolveInAppPushUrl,
  sendWebPushToSubscriptions,
} from '../_shared/webPush.ts';

const allowedOrigins = new Set([
  'https://trabage.org',
  'https://www.trabage.org',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://trabage.org',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    Vary: 'Origin',
  };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

function buildDedupKey(userId: string, notificationType: string, data: Record<string, unknown> = {}) {
  const suffix =
    String(data.message_id ?? '') ||
    String(data.conversation_id ?? '') ||
    String(data.job_id ?? '') ||
    String(data.application_id ?? '') ||
    String(data.post_id ?? '') ||
    String(data.comment_id ?? '') ||
    String(data.follower_id ?? '') ||
    String(data.target_id ?? '') ||
    String(data.request_id ?? '') ||
    String(data.notification_id ?? '') ||
    'general';
  return `${notificationType}:${userId}:${suffix}`;
}

serve(async (request) => {
  const headers = cors(request.headers.get('origin'));
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceRole || !isVapidConfigured()) {
    return json({ error: 'push_not_configured' }, 503, headers);
  }

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const trusted = bearer === serviceRole;
  if (!trusted && !bearer) return json({ error: 'unauthorized' }, 401, headers);

  let auth: { user: { id?: string } | null } = { user: null };
  if (!trusted) {
    try {
      const res = await admin.auth.getUser(bearer);
      auth = res.data ?? { user: null };
    } catch (e) {
      console.error('[send_web_push] auth_lookup_error', e);
      return json({ error: 'unauthorized' }, 401, headers);
    }
    if (!auth.user?.id) return json({ error: 'unauthorized' }, 401, headers);
  }

  const input = await request.json().catch(() => null);
  const ids = Array.isArray(input?.recipient_ids) ? input.recipient_ids : [input?.recipient_id];
  const recipients = [...new Set((ids ?? []).filter((id: unknown) => typeof id === 'string' && id.length <= 64))];
  if (!recipients.length || (!trusted && (recipients.length !== 1 || recipients[0] !== auth.user!.id))) {
    return json({ error: 'forbidden_target' }, 403, headers);
  }

  const data = {
    ...((input?.data ?? {}) as Record<string, unknown>),
    ...(input?.notification_id ? { notification_id: input.notification_id } : {}),
  };
  const notificationType = text(data.type ?? input?.type ?? 'system_update', 80) || 'system_update';
  const { data: allowedRecipients, error: preferencesError } = await admin.rpc('filter_push_recipients', {
    p_recipient_ids: recipients,
    p_type: notificationType,
  });
  if (preferencesError) {
    return json({ error: 'preferences_lookup_failed' }, 500, headers);
  }

  const pushRecipients = Array.isArray(allowedRecipients) ? allowedRecipients.map(String) : [];
  const conversationId = data.conversation_id ? String(data.conversation_id) : '';

  const finalRecipients: string[] = [];
  for (const userId of pushRecipients) {
    if (notificationType === 'new_message' && conversationId) {
      const { data: isViewing } = await admin.rpc('is_viewing_conversation', {
        p_user_id: userId,
        p_conversation_id: conversationId,
      });
      if (isViewing === true) continue;
    }
    finalRecipients.push(userId);
  }

  let sent = 0;
  let failed = 0;
  let invalid = 0;
  let deduped = 0;

  for (const userId of finalRecipients) {
    const dedupKey = buildDedupKey(userId, notificationType, data);
    const { data: existingLog } = await admin
      .from('push_send_log')
      .select('id, status, created_at')
      .eq('dedup_key', dedupKey)
      .maybeSingle();
    const logAgeMs = existingLog?.created_at
      ? Date.now() - new Date(String(existingLog.created_at)).getTime()
      : Number.POSITIVE_INFINITY;
    if (existingLog?.status === 'sent') {
      deduped += 1;
      continue;
    }
    if (existingLog?.status === 'pending' && logAgeMs < 2 * 60 * 1000) {
      deduped += 1;
      continue;
    }
    if (existingLog) {
      const { data: reclaimed, error: reclaimError } = await admin
        .from('push_send_log')
        .update({ status: 'pending', error_message: null, created_at: new Date().toISOString() })
        .eq('id', existingLog.id)
        .in('status', ['failed', 'pending'])
        .select('id')
        .maybeSingle();
      if (reclaimError || !reclaimed) {
        deduped += 1;
        continue;
      }
    } else {
      const claimed = await admin.from('push_send_log').insert({
        dedup_key: dedupKey,
        user_id: userId,
        notification_type: notificationType,
        status: 'pending',
        error_message: null,
        fcm_message_id: null,
      });
      if (claimed.error) {
        deduped += 1;
        continue;
      }
    }

    const subscriptions = await loadWebPushSubscriptionsForUsers(admin, [userId]);
    const payload = buildWebPushPayload(
      text(input?.title, 120) || 'TrabaGE',
      text(input?.body, 240),
      {
        ...data,
        type: notificationType,
        link: resolveInAppPushUrl(data),
      },
      { notificationId: text(input?.notification_id ?? data.notification_id, 80) || null },
    );
    const result = await sendWebPushToSubscriptions(admin, subscriptions, payload);
    sent += result.sent;
    failed += result.failed;
    invalid += result.invalid;
    await admin.from('push_send_log').update({
      status: result.sent > 0 ? 'sent' : 'failed',
      error_message: result.sent > 0 ? null : `delivery_failed:web:${result.failed}:${result.invalid}`,
    }).eq('dedup_key', dedupKey);
  }

  console.log('send_web_push_delivery', {
    notificationType,
    recipient_count: finalRecipients.length,
    sent,
    invalid,
    failed,
    deduped,
  });

  return json({
    ok: true,
    targeted: finalRecipients.length,
    sent,
    invalid,
    failed,
    deduped,
    skipped_preferences: recipients.length - pushRecipients.length,
    skipped_active_chat: pushRecipients.length - finalRecipients.length,
  }, 200, headers);
});
