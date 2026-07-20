const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';
const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function getOneSignalConfig() {
  const appId = Deno.env.get('ONESIGNAL_APP_ID')?.trim() ?? '';
  const restApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY')?.trim() ?? '';
  return { appId, restApiKey };
}

export function isOneSignalConfigured(): boolean {
  const { appId, restApiKey } = getOneSignalConfig();
  return Boolean(appId && restApiKey);
}

export type OneSignalSendPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  link?: string;
  externalIds?: string[];
  idempotencyKey?: string;
  iosBadgeType?: 'Increase' | 'Set';
  iosBadgeCount?: number;
};

export type OneSignalSendResult = {
  ok: boolean;
  notificationId?: string;
  recipients?: number;
  error?: string;
  invalidExternalIds?: string[];
  retryable?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractInvalidExternalIds(errors: unknown): string[] {
  if (!errors || typeof errors !== 'object') return [];

  const record = errors as Record<string, unknown>;
  const invalid = record.invalid_aliases ?? record.invalid_external_user_ids;
  if (Array.isArray(invalid)) {
    return invalid.map(String);
  }

  return [];
}

export async function sendOneSignalNotification(
  payload: OneSignalSendPayload,
  appUrl: string,
): Promise<OneSignalSendResult> {
  const { appId, restApiKey } = getOneSignalConfig();
  if (!appId || !restApiKey) {
    return { ok: false, error: 'OneSignal no configurado' };
  }

  const externalIds = [...new Set((payload.externalIds ?? []).filter(Boolean).map(String))];
  if (externalIds.length === 0) {
    return { ok: false, error: 'No recipients' };
  }

  const rawLink = payload.link?.trim() ?? payload.data?.link?.trim() ?? '';
  const absoluteUrl = rawLink
    ? (rawLink.startsWith('http') ? rawLink : `${appUrl.replace(/\/$/, '')}${rawLink.startsWith('/') ? rawLink : `/${rawLink}`}`)
    : undefined;

  const requestBody: Record<string, unknown> = {
    app_id: appId,
    target_channel: 'push',
    include_aliases: { external_id: externalIds },
    headings: { en: payload.title, es: payload.title },
    contents: { en: payload.body, es: payload.body },
    data: payload.data ?? {},
    url: absoluteUrl,
    web_url: absoluteUrl,
    ios_badgeType: payload.iosBadgeType ?? 'Increase',
    ios_badgeCount: payload.iosBadgeCount ?? 1,
  };

  if (payload.idempotencyKey) {
    requestBody.external_id = payload.idempotencyKey;
  }

  let lastError = 'OneSignal send failed';
  let lastRetryable = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(ONESIGNAL_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Key ${restApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json().catch(() => ({}));
      const notificationId = typeof result?.id === 'string' ? result.id : '';
      const invalidExternalIds = extractInvalidExternalIds(result?.errors);

      if (response.ok && notificationId) {
        return {
          ok: true,
          notificationId,
          recipients: Number(result?.recipients ?? externalIds.length),
          invalidExternalIds,
        };
      }

      lastError =
        (Array.isArray(result?.errors) ? result.errors.join('; ') : null) ??
        (typeof result?.errors === 'string' ? result.errors : null) ??
        `OneSignal HTTP ${response.status}`;
      lastRetryable = RETRYABLE_STATUS.has(response.status);

      if (!lastRetryable || attempt === MAX_RETRIES - 1) {
        return {
          ok: false,
          error: lastError,
          invalidExternalIds,
          retryable: lastRetryable,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'OneSignal network error';
      lastRetryable = true;
      if (attempt === MAX_RETRIES - 1) {
        return { ok: false, error: lastError, retryable: true };
      }
    }

    await sleep(400 * (attempt + 1));
  }

  return { ok: false, error: lastError, retryable: lastRetryable };
}
