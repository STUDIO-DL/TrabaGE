import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import webpush from 'npm:web-push@3.6.7';

const allowedOrigins = new Set(['https://trabage.org', 'http://localhost:5173', 'http://127.0.0.1:5173']);
const cors = (origin: string | null) => ({ 'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://trabage.org', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', Vary: 'Origin' });
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
const safeUrl = (value: unknown) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

serve(async (request) => {
  const headers = cors(request.headers.get('origin'));
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers);
  const url = Deno.env.get('SUPABASE_URL') ?? ''; const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''; const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''; const subject = Deno.env.get('VAPID_SUBJECT') ?? '';
  if (!url || !serviceRole || !publicKey || !privateKey || !subject) return json({ error: 'push_not_configured' }, 503, headers);
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''; const admin = createClient(url, serviceRole); const trusted = bearer === serviceRole;
  const { data: auth } = trusted ? { data: { user: null } } : await admin.auth.getUser(bearer);
  if (!trusted && !auth.user) return json({ error: 'unauthorized' }, 401, headers);
  const input = await request.json().catch(() => null); const ids = Array.isArray(input?.recipient_ids) ? input.recipient_ids : [input?.recipient_id];
  const recipients = [...new Set(ids.filter((id: unknown) => typeof id === 'string' && id.length <= 64))];
  if (!recipients.length || (!trusted && (recipients.length !== 1 || recipients[0] !== auth.user!.id))) return json({ error: 'forbidden_target' }, 403, headers);
  const payload = { title: text(input?.title, 120) || 'TrabaGE', body: text(input?.body, 240), icon: '/icons/icon-192.png', badge: '/icons/icon-72.png', url: safeUrl(input?.data?.link ?? input?.url), notificationId: text(input?.notification_id, 80) || null };
  const { data: subscriptions, error } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id', recipients).eq('is_active', true).not('endpoint', 'is', null);
  if (error) return json({ error: 'subscriptions_lookup_failed' }, 500, headers);
  webpush.setVapidDetails(subject, publicKey, privateKey); let sent = 0; let invalid = 0; let failed = 0;
  await Promise.all((subscriptions ?? []).map(async (subscription) => { try {
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 86400 }); sent += 1;
  } catch (sendError) { const status = Number((sendError as { statusCode?: number }).statusCode ?? 0); if (status === 404 || status === 410) { invalid += 1; await admin.from('push_subscriptions').update({ is_active: false }).eq('id', subscription.id); } else { failed += 1; console.error('web_push_delivery_failed', { subscriptionId: subscription.id, status }); } } }));
  return json({ ok: true, targeted: subscriptions?.length ?? 0, sent, invalid, failed }, 200, headers);
});
