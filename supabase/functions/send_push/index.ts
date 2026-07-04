import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
  const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID') ?? '';
  const oneSignalRestApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY') ?? '';
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: 'Supabase no configurado' }, 500);
  }

  if (!oneSignalAppId || !oneSignalRestApiKey) {
    return jsonResponse({ error: 'OneSignal no configurado' }, 500);
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

  const payloadBody = await req.json();
  const {
    recipient_id,
    recipient_ids,
    player_id,
    player_ids,
    title,
    body,
    data,
  } = payloadBody;

  const externalIds = Array.isArray(recipient_ids)
    ? recipient_ids.filter(Boolean)
    : recipient_id
      ? [recipient_id]
      : [];

  const subscriptionIds = Array.isArray(player_ids)
    ? player_ids.filter(Boolean)
    : player_id
      ? [player_id]
      : [];

  if (subscriptionIds.length > 0) {
    return jsonResponse({ error: 'Los player_id solo se pueden usar desde procesos internos' }, 403);
  }

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
  const admin = createClient(supabaseUrl, serviceKey);

  if (!isSelfOnly) {
    let notificationQuery = admin
      .from('notifications')
      .select('recipient_id')
      .in('recipient_id', uniqueExternalIds)
      .eq('type', notificationType)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

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

  const { data: allowedRecipients, error: preferencesError } = await admin.rpc('filter_push_recipients', {
    p_recipient_ids: uniqueExternalIds,
    p_type: notificationType,
  });

  if (preferencesError) {
    return jsonResponse({ error: 'No se pudieron validar las preferencias' }, 500);
  }

  const pushRecipients = Array.isArray(allowedRecipients) ? allowedRecipients.map(String) : [];
  if (pushRecipients.length === 0) {
    return jsonResponse({
      ok: true,
      id: null,
      recipients: 0,
      skipped: uniqueExternalIds.length,
    });
  }

  const payload: Record<string, unknown> = {
    app_id: oneSignalAppId,
    target_channel: 'push',
    headings: { en: title, es: title },
    contents: { en: body, es: body },
    data,
  };

  payload.include_aliases = { external_id: pushRecipients };

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${oneSignalRestApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    return jsonResponse({ error: 'No se pudo enviar la notificación' }, res.status);
  }

  return jsonResponse({
    ok: true,
    id: result?.id ?? null,
    recipients: pushRecipients.length,
    skipped: uniqueExternalIds.length - pushRecipients.length,
  });
});
