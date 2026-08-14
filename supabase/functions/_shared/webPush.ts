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

export function isVapidConfigured(): boolean {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const subject = Deno.env.get('VAPID_SUBJECT') ?? '';
  return Boolean(publicKey && privateKey && subject);
}

export function resolveInAppPushUrl(data: Record<string, unknown> = {}): string {
  const candidate = String(data.link ?? data.url ?? '').trim();
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
  return '/';
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
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    url: resolveInAppPushUrl(data),
    notificationId: options.notificationId ?? null,
    ...data,
    url: resolveInAppPushUrl(data),
  };
}

function ensureVapidConfigured() {
  if (!isVapidConfigured()) {
    throw new Error('VAPID no configurado');
  }
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? '',
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

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        serialized,
        { TTL: 86400 },
      );
      sent += 1;
      if (subscription.user_id) touchedUsers.add(subscription.user_id);
    } catch (err) {
      const status = Number((err as { statusCode?: number }).statusCode ?? 0);
      if (status === 404 || status === 410) {
        invalid += 1;
        await admin.from('push_subscriptions').update({ is_active: false }).eq('id', subscription.id);
      } else {
        failed += 1;
        console.error('web_push_delivery_failed', {
          subscriptionId: subscription.id,
          userId: subscription.user_id ?? null,
          status,
        });
      }
    }
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
