import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

import { isOneSignalConfigured, sendOneSignalNotification } from '../_shared/onesignal.ts';



const corsHeaders = {

  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',

  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',

  'Vary': 'Origin',

};



const DEDUP_WINDOW_MS = 10 * 60 * 1000;

const PUSH_BATCH_SIZE = 2000;



function jsonResponse(body: Record<string, unknown>, status = 200) {

  return new Response(JSON.stringify(body), {

    status,

    headers: { ...corsHeaders, 'Content-Type': 'application/json' },

  });

}



function buildDedupKey(userId: string, notificationType: string, data: Record<string, unknown> = {}) {

  const suffix =

    String(data.job_id ?? '') ||

    String(data.application_id ?? '') ||

    String(data.target_id ?? '') ||

    String(data.request_id ?? '') ||

    'general';

  return `${notificationType}:${userId}:${suffix}`;

}



function chunkArray<T>(items: T[], size: number): T[][] {

  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {

    chunks.push(items.slice(i, i + size));

  }

  return chunks;

}



async function isAdminUser(admin: ReturnType<typeof createClient>, userId: string) {

  const { data } = await admin

    .from('user_roles')

    .select('role')

    .eq('user_id', userId)

    .maybeSingle();

  return data?.role === 'admin';

}



async function sendToRecipients(

  admin: ReturnType<typeof createClient>,

  recipientIds: string[],

  title: string,

  body: string,

  data: Record<string, unknown>,

  appUrl: string,

  options: { skipDedup?: boolean; notificationType?: string } = {},

) {

  const notificationType = String(options.notificationType ?? data?.type ?? 'system_update').trim();

  const rawLink = data?.link ? String(data.link).trim() : '';

  let sent = 0;

  let failed = 0;

  let deduped = 0;

  let skipped = 0;



  const { data: allowedRecipients, error: preferencesError } = await admin.rpc('filter_push_recipients', {

    p_recipient_ids: recipientIds,

    p_type: notificationType,

  });



  if (preferencesError) {

    return { error: 'No se pudieron validar las preferencias', sent, failed, deduped, skipped };

  }



  const pushRecipients = Array.isArray(allowedRecipients) ? allowedRecipients.map(String) : [];

  skipped = recipientIds.length - pushRecipients.length;



  const stringData: Record<string, string> = {};

  for (const [key, value] of Object.entries(data ?? {})) {

    if (value != null) stringData[key] = String(value);

  }



  for (const userId of pushRecipients) {

    if (!options.skipDedup) {

      const dedupKey = buildDedupKey(userId, notificationType, data);

      const { data: existingLog } = await admin

        .from('push_send_log')

        .select('id')

        .eq('dedup_key', dedupKey)

        .gte('created_at', new Date(Date.now() - DEDUP_WINDOW_MS).toISOString())

        .maybeSingle();



      if (existingLog) {

        deduped += 1;

        continue;

      }



      const result = await sendOneSignalNotification({

        title,

        body,

        data: stringData,

        link: rawLink || undefined,

        externalIds: [userId],

        idempotencyKey: dedupKey,

      }, appUrl);



      await admin.from('push_send_log').upsert({

        dedup_key: dedupKey,

        user_id: userId,

        notification_type: notificationType,

        status: result.ok ? 'sent' : 'failed',

        error_message: result.ok ? null : result.error,

        onesignal_notification_id: result.notificationId ?? null,

      }, { onConflict: 'dedup_key' });



      if (result.ok) {

        sent += 1;

        await admin

          .from('push_subscriptions')

          .update({ last_used_at: new Date().toISOString() })

          .eq('user_id', userId)

          .eq('is_active', true);

      } else {

        failed += 1;

        if (result.invalidExternalIds?.includes(userId)) {

          await admin

            .from('push_subscriptions')

            .update({ is_active: false, updated_at: new Date().toISOString() })

            .eq('user_id', userId)

            .eq('is_active', true);

        }

      }



      continue;

    }



    const result = await sendOneSignalNotification({

      title,

      body,

      data: stringData,

      link: rawLink || undefined,

      externalIds: [userId],

    }, appUrl);



    if (result.ok) {

      sent += 1;

    } else {

      failed += 1;

    }

  }



  return { sent, failed, deduped, skipped };

}



async function sendAdminBroadcast(
  admin: ReturnType<typeof createClient>,
  userClient: ReturnType<typeof createClient>,
  callerId: string,
  payload: Record<string, unknown>,
  appUrl: string,
) {

  const title = String(payload.title ?? '').trim();

  const body = String(payload.body ?? '').trim();

  const audienceFilter = (payload.audience_filter ?? payload.audience ?? {}) as Record<string, unknown>;

  const data = (payload.data ?? {}) as Record<string, unknown>;

  const scheduledAtRaw = payload.scheduled_at ? String(payload.scheduled_at) : null;

  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;



  if (!title || !body) {

    return jsonResponse({ error: 'title and body required' }, 400);

  }



  const notificationData = {

    type: String(data.type ?? 'admin_broadcast'),

    link: data.link ? String(data.link) : '/personal/notifications',

    ...data,

  };



  if (scheduledAt && scheduledAt.getTime() > Date.now() + 30_000) {

    const { data: scheduledRow, error } = await userClient.rpc('admin_schedule_push_notification', {

      p_title: title,

      p_body: body,

      p_payload: notificationData,

      p_audience_filter: audienceFilter,

      p_scheduled_at: scheduledAt.toISOString(),

    });



    if (error) {

      return jsonResponse({ error: 'No se pudo programar la notificación' }, 500);

    }



    return jsonResponse({

      ok: true,

      scheduled: true,

      scheduled_id: scheduledRow?.id ?? null,

      scheduled_at: scheduledAt.toISOString(),

    });

  }



  const { data: audienceIds, error: audienceError } = await userClient.rpc('admin_resolve_push_audience', {

    p_filter: audienceFilter,

  });



  if (audienceError) {

    return jsonResponse({ error: 'No se pudo resolver la audiencia' }, 500);

  }



  const recipientIds = Array.isArray(audienceIds) ? audienceIds.map(String) : [];

  if (recipientIds.length === 0) {

    return jsonResponse({ ok: true, sent: 0, failed: 0, skipped: 0, recipient_count: 0 });

  }



  let sent = 0;

  let failed = 0;

  let skipped = 0;



  for (const batch of chunkArray(recipientIds, PUSH_BATCH_SIZE)) {

    const { data: allowedRecipients, error: preferencesError } = await admin.rpc('filter_push_recipients', {

      p_recipient_ids: batch,

      p_type: String(notificationData.type),

    });



    if (preferencesError) {

      return jsonResponse({ error: 'No se pudieron validar las preferencias' }, 500);

    }



    const pushRecipients = Array.isArray(allowedRecipients) ? allowedRecipients.map(String) : [];

    skipped += batch.length - pushRecipients.length;



    if (pushRecipients.length === 0) continue;



    const stringData: Record<string, string> = {};

    for (const [key, value] of Object.entries(notificationData)) {

      if (value != null) stringData[key] = String(value);

    }



    const result = await sendOneSignalNotification({

      title,

      body,

      data: stringData,

      link: stringData.link,

      externalIds: pushRecipients,

    }, appUrl);



    if (result.ok) {

      sent += pushRecipients.length;

      await admin

        .from('push_subscriptions')

        .update({ last_used_at: new Date().toISOString() })

        .in('user_id', pushRecipients)

        .eq('is_active', true);

    } else {

      failed += pushRecipients.length;

    }

  }



  const { data: logRow, error: logError } = await admin

    .from('admin_push_broadcast_log')

    .insert({

      sent_by: callerId,

      audience_filter: audienceFilter,

      title,

      body,

      payload: notificationData,

      sent_at: new Date().toISOString(),

      status: failed > 0 && sent === 0 ? 'failed' : 'sent',

      recipient_count: sent,

      error: failed > 0 && sent === 0 ? 'OneSignal send failed' : null,

    })

    .select('id')

    .maybeSingle();



  if (logError) {

    return jsonResponse({ error: 'Envío completado pero no se pudo registrar el historial' }, 500);

  }



  return jsonResponse({

    ok: true,

    sent,

    failed,

    skipped,

    recipient_count: sent,

    broadcast_log_id: logRow?.id ?? null,

  });

}



async function processScheduledNotifications(

  admin: ReturnType<typeof createClient>,

  appUrl: string,

) {

  const { data: queued, error: queueError } = await admin.rpc('process_due_scheduled_push_notifications', {

    p_limit: 10,

  });



  if (queueError) {

    return jsonResponse({ error: 'No se pudieron procesar notificaciones programadas' }, 500);

  }



  const { data: dueRows, error } = await admin

    .from('scheduled_push_notifications')

    .select('*')

    .eq('status', 'processing')

    .order('scheduled_at', { ascending: true })

    .limit(10);



  if (error) {

    return jsonResponse({ error: 'No se pudieron leer notificaciones programadas' }, 500);

  }



  let processed = 0;

  let sentTotal = 0;



  for (const row of dueRows ?? []) {

    const { data: audienceIds, error: audienceError } = await admin.rpc('admin_resolve_push_audience', {

      p_filter: row.audience_filter ?? {},

    });



    if (audienceError) {

      await admin

        .from('scheduled_push_notifications')

        .update({ status: 'failed', error: audienceError.message, processed_at: new Date().toISOString() })

        .eq('id', row.id);

      continue;

    }



    const recipientIds = Array.isArray(audienceIds) ? audienceIds.map(String) : [];

    const notificationData = (row.payload ?? { type: 'admin_broadcast' }) as Record<string, unknown>;

    let sent = 0;

    let failed = 0;



    for (const batch of chunkArray(recipientIds, PUSH_BATCH_SIZE)) {

      const { data: allowedRecipients } = await admin.rpc('filter_push_recipients', {

        p_recipient_ids: batch,

        p_type: String(notificationData.type ?? 'admin_broadcast'),

      });



      const pushRecipients = Array.isArray(allowedRecipients) ? allowedRecipients.map(String) : [];

      if (pushRecipients.length === 0) continue;



      const stringData: Record<string, string> = {};

      for (const [key, value] of Object.entries(notificationData)) {

        if (value != null) stringData[key] = String(value);

      }



      const result = await sendOneSignalNotification({

        title: row.title,

        body: row.body,

        data: stringData,

        link: stringData.link,

        externalIds: pushRecipients,

      }, appUrl);



      if (result.ok) sent += pushRecipients.length;

      else failed += pushRecipients.length;

    }



    await admin

      .from('admin_push_broadcast_log')

      .update({

        sent_at: new Date().toISOString(),

        status: failed > 0 && sent === 0 ? 'failed' : 'sent',

        recipient_count: sent,

        error: failed > 0 && sent === 0 ? 'OneSignal send failed' : null,

      })

      .eq('id', row.broadcast_log_id);



    await admin

      .from('scheduled_push_notifications')

      .update({

        status: failed > 0 && sent === 0 ? 'failed' : 'sent',

        error: failed > 0 && sent === 0 ? 'OneSignal send failed' : null,

        processed_at: new Date().toISOString(),

      })

      .eq('id', row.id);



    processed += 1;

    sentTotal += sent;

  }



  return jsonResponse({

    ok: true,

    queued: queued?.queued ?? 0,

    processed,

    sent: sentTotal,

  });

}



serve(async (req) => {

  if (req.method === 'OPTIONS') {

    return new Response('ok', { headers: corsHeaders });

  }



  if (req.method !== 'POST') {

    return jsonResponse({ error: 'Method not allowed' }, 405);

  }



  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const authHeader = req.headers.get('Authorization');



  if (!supabaseUrl || !anonKey || !serviceKey) {

    return jsonResponse({ error: 'Supabase no configurado' }, 500);

  }



  if (!isOneSignalConfigured()) {

    return jsonResponse({ error: 'OneSignal no configurado' }, 500);

  }



  if (!authHeader) {

    return jsonResponse({ error: 'No autorizado' }, 401);

  }



  const admin = createClient(supabaseUrl, serviceKey);

  const userClient = createClient(supabaseUrl, anonKey, {

    global: { headers: { Authorization: authHeader } },

  });



  const payloadBody = await req.json();

  const appUrl = (

    Deno.env.get('APP_URL') ??

    Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ??

    'https://trabage.org'

  ).replace(/\/$/, '');



  const isServiceRole = authHeader.replace('Bearer ', '').trim() === serviceKey;



  if (payloadBody.process_scheduled === true) {

    if (!isServiceRole && !(await isAdminUser(admin, (await userClient.auth.getUser()).data.user?.id ?? ''))) {

      return jsonResponse({ error: 'No autorizado' }, 403);

    }

    return processScheduledNotifications(admin, appUrl);

  }



  const { data: authData, error: authError } = await userClient.auth.getUser();

  const callerId = authData.user?.id;



  if (authError || !callerId) {

    return jsonResponse({ error: 'No autorizado' }, 403);

  }



  if (payloadBody.admin_broadcast === true) {

    if (!(await isAdminUser(admin, callerId))) {

      return jsonResponse({ error: 'No autorizado' }, 403);

    }

    return sendAdminBroadcast(admin, userClient, callerId, payloadBody, appUrl);

  }



  const {

    recipient_id,

    recipient_ids,

    title,

    body,

    data = {},

  } = payloadBody;



  const externalIds = Array.isArray(recipient_ids)

    ? recipient_ids.filter(Boolean)

    : recipient_id

      ? [recipient_id]

      : [];



  if (externalIds.length === 0) {

    return jsonResponse({ error: 'No recipients' }, 400);

  }



  if (!title || !body) {

    return jsonResponse({ error: 'title and body required' }, 400);

  }



  const uniqueExternalIds = [...new Set(externalIds.map(String))];

  const notificationType = String(data?.type ?? '').trim();

  if (!notificationType) {

    return jsonResponse({ error: 'No autorizado' }, 403);

  }



  const isSelfOnly = uniqueExternalIds.every((id) => id === callerId);



  if (!isSelfOnly) {

    let notificationQuery = admin

      .from('notifications')

      .select('recipient_id')

      .in('recipient_id', uniqueExternalIds)

      .eq('type', notificationType)

      .gte('created_at', new Date(Date.now() - DEDUP_WINDOW_MS).toISOString());



    if (data?.job_id) {

      notificationQuery = notificationQuery.eq('metadata->>job_id', String(data.job_id));

    }



    if (data?.target_id) {

      notificationQuery = notificationQuery.eq('metadata->>target_id', String(data.target_id));

    }



    const { data: notifications, error } = await notificationQuery;

    if (error) {

      return jsonResponse({ error: 'No se pudo validar la notificación' }, 500);

    }



    const authorizedRecipients = new Set((notifications ?? []).map((item) => item.recipient_id));

    if (!uniqueExternalIds.every((id) => authorizedRecipients.has(id))) {

      return jsonResponse({ error: 'No autorizado' }, 403);

    }

  }



  let sent = 0;

  let failed = 0;

  let deduped = 0;

  let skipped = 0;



  for (const batch of chunkArray(uniqueExternalIds, PUSH_BATCH_SIZE)) {

    const result = await sendToRecipients(admin, batch, title, body, data, appUrl, { notificationType });

    if (result.error) {

      return jsonResponse({ error: result.error }, 500);

    }

    sent += result.sent ?? 0;

    failed += result.failed ?? 0;

    deduped += result.deduped ?? 0;

    skipped += result.skipped ?? 0;

  }



  return jsonResponse({

    ok: true,

    sent,

    failed,

    deduped,

    skipped,

  });

});


