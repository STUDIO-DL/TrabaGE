import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import webpush from 'npm:web-push@3.6.7';

export type WebPushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id?: string;
};

export type WebPushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url: string;
  notificationId?: string | null;
  type?: string;
  [key: string]: unknown;
};

const DEFAULT_VAPID_SUBJECT = 'mailto:contacto@trabage.org';
const DEFAULT_APP_URL = 'https://trabage.org';
const RETRYABLE_STATUS = new Set([0, 429, 500, 502, 503, 504]);

export function resolveAppUrl(): string {
  return (
    Deno.env.get('APP_URL') ??
    Deno.env.get('TRABAGE_PUBLIC_URL') ??
    Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ??
    DEFAULT_APP_URL
  ).replace(/\/$/, '');
}

export function resolveVapidSubject(): string {
  const subject = (Deno.env.get('VAPID_SUBJECT') ?? '').trim();
  return subject || DEFAULT_VAPID_SUBJECT;
}

export function isVapidConfigured(): boolean {
  const publicKey = (Deno.env.get('VAPID_PUBLIC_KEY') ?? '').trim();
  const privateKey = (Deno.env.get('VAPID_PRIVATE_KEY') ?? '').trim();
  return Boolean(publicKey && privateKey);
}

export function resolveInAppPushUrl(data: Record<string, unknown> = {}): string {
  const candidate = String(data.link ?? data.url ?? '').trim();
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
  return '/';
}

function assetUrl(path: string): string {
  return `${resolveAppUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildWebPushPayload(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  options: { notificationId?: string | null } = {},
): WebPushPayload {
  const notificationType = String(data.type ?? 'system_update').trim();
  return {
    type: notificationType,
    title: String(title ?? 'TrabaGE').trim() || 'TrabaGE',
    body: String(body ?? '').trim(),
    icon: assetUrl('/icons/icon-192.png'),
    badge: assetUrl('/icons/icon-72.png'),
    url: resolveInAppPushUrl(data),
    notificationId: options.notificationId ?? null,
    ...data,
    url: resolveInAppPushUrl(data),
    icon: assetUrl('/icons/icon-192.png'),
    badge: assetUrl('/icons/icon-72.png'),
  };
}

function ensureVapidConfigured() {
  if (!isVapidConfigured()) {
    throw new Error('VAPID no configurado');
  }
  webpush.setVapidDetails(
    resolveVapidSubject(),
    Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
    Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
  );
}

export async function loadWebPushSubscriptionsForUsers(
  admin: SupabaseClient,
  userIds: string[],
): Promise<WebPushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth')
    .in('user_id', userIds)
    .eq('is_active', true)
    .not('endpoint', 'is', null);
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row) => ({
      id: String(row.id ?? ''),
      user_id: String(row.user_id ?? ''),
      endpoint: String(row.endpoint ?? ''),
      p256dh: String(row.p256dh ?? ''),
      auth: String(row.auth ?? ''),
    }))
    .filter((row) => row.id && row.endpoint && row.p256dh && row.auth);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendOne(
  subscription: WebPushSubscriptionRow,
  serialized: string,
): Promise<'sent' | 'invalid' | 'failed'> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        serialized,
        { TTL: 86400, urgency: 'high', headers: { Urgency: 'high' } },
      );
      return 'sent';
    } catch (err) {
      lastStatus = Number((err as { statusCode?: number }).statusCode ?? 0);
      if (lastStatus === 404 || lastStatus === 410) return 'invalid';
      if (!RETRYABLE_STATUS.has(lastStatus) || attempt === 2) {
        console.error('web_push_delivery_failed', {
          subscriptionId: subscription.id,
          userId: subscription.user_id ?? null,
          status: lastStatus,
          attempt: attempt + 1,
        });
        return 'failed';
      }
      await sleep(400 * (2 ** attempt));
    }
  }
  console.error('web_push_delivery_failed', {
    subscriptionId: subscription.id,
    userId: subscription.user_id ?? null,
    status: lastStatus,
  });
  return 'failed';
}

export async function sendWebPushToSubscriptions(
  admin: SupabaseClient,
  subscriptions: WebPushSubscriptionRow[],
  payload: WebPushPayload,
): Promise<{ sent: number; failed: number; invalid: number }> {
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, invalid: 0 };
  }

  ensureVapidConfigured();
  const serialized = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let invalid = 0;
  const touchedUsers = new Set<string>();
  const staleIds: string[] = [];

  const chunkSize = 8;
  for (let index = 0; index < subscriptions.length; index += chunkSize) {
    const chunk = subscriptions.slice(index, index + chunkSize);
    const results = await Promise.all(chunk.map((subscription) => sendOne(subscription, serialized)));
    results.forEach((result, offset) => {
      const subscription = chunk[offset];
      if (result === 'sent') {
        sent += 1;
        if (subscription.user_id) touchedUsers.add(subscription.user_id);
        return;
      }
      if (result === 'invalid') {
        invalid += 1;
        staleIds.push(subscription.id);
        return;
      }
      failed += 1;
    });
  }

  if (staleIds.length > 0) {
    await admin.from('push_subscriptions').update({ is_active: false }).in('id', staleIds);
  }

  if (touchedUsers.size > 0) {
    await admin
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .in('user_id', [...touchedUsers])
      .eq('is_active', true);
  }

  return { sent, failed, invalid };
}
