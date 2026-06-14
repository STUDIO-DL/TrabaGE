import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { recipient_id, title, body, data } = await req.json();

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`,
    },
    body: JSON.stringify({
      app_id: Deno.env.get('ONESIGNAL_APP_ID'),
      include_aliases: { external_id: [recipient_id] },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data,
    }),
  });

  const result = await res.json();
  return new Response(JSON.stringify(result), {
    status: res.ok ? 200 : res.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
