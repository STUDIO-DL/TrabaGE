import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const {
    recipient_id,
    recipient_ids,
    player_id,
    player_ids,
    title,
    body,
    data,
  } = await req.json();

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

  if (externalIds.length === 0 && subscriptionIds.length === 0) {
    return new Response(JSON.stringify({ error: 'No recipients' }), { status: 400 });
  }

  const payload: Record<string, unknown> = {
    app_id: Deno.env.get('ONESIGNAL_APP_ID'),
    target_channel: 'push',
    headings: { en: title, es: title },
    contents: { en: body, es: body },
    data,
  };

  if (subscriptionIds.length > 0) {
    payload.include_subscription_ids = subscriptionIds.map(String);
  } else {
    payload.include_aliases = { external_id: externalIds.map(String) };
  }

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  return new Response(JSON.stringify(result), {
    status: res.ok ? 200 : res.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
