const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

type FcmConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export type FcmSendPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  link?: string;
  tokens?: string[];
  iosBadgeCount?: number;
};

export type FcmSendResult = {
  ok: boolean;
  messageIds?: string[];
  recipients?: number;
  error?: string;
  invalidTokens?: string[];
  retryable?: boolean;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

export function getFcmConfig(): FcmConfig {
  return {
    projectId: Deno.env.get('FIREBASE_PROJECT_ID')?.trim() ?? '',
    clientEmail: Deno.env.get('FIREBASE_CLIENT_EMAIL')?.trim() ?? '',
    privateKey: normalizePrivateKey(Deno.env.get('FIREBASE_PRIVATE_KEY') ?? ''),
  };
}

export function isFcmConfigured(): boolean {
  const { projectId, clientEmail, privateKey } = getFcmConfig();
  return Boolean(projectId && clientEmail && privateKey.includes('BEGIN'));
}

function encodeBase64Url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    raw,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function createServiceAccountJwt(config: FcmConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: config.clientEmail,
    sub: config.clientEmail,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
    scope: FCM_SCOPE,
  };

  const unsigned = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(claim))}`;
  const key = await importPrivateKey(config.privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${encodeBase64Url(new Uint8Array(signature))}`;
}

async function getAccessToken(config: FcmConfig): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) {
    return cachedAccessToken.token;
  }

  const assertion = await createServiceAccountJwt(config);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result?.access_token !== 'string') {
    throw new Error(
      typeof result?.error_description === 'string'
        ? result.error_description
        : `FCM OAuth HTTP ${response.status}`,
    );
  }

  const expiresIn = Number(result.expires_in ?? 3600);
  cachedAccessToken = {
    token: result.access_token,
    expiresAt: now + expiresIn * 1000,
  };
  return result.access_token;
}

function resolveAbsoluteLink(
  payload: FcmSendPayload,
  appUrl: string,
): string | undefined {
  const data = { ...(payload.data ?? {}) };
  const postId = data.post_id ?? data.postId;
  if (postId) {
    data.post_id = postId;
    data.link = `/post/${postId}`;
  }

  const rawLink = data.link?.trim() || payload.link?.trim() || '';
  if (!rawLink) return undefined;

  const base = appUrl.replace(/\/$/, '');
  if (/^https?:\/\//i.test(rawLink)) {
    try {
      const parsed = new URL(rawLink);
      const allowed = new URL(base);
      if (parsed.origin !== allowed.origin) return undefined;
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return undefined;
    }
  }

  return `${base}${rawLink.startsWith('/') ? rawLink : `/${rawLink}`}`;
}

function buildStringData(
  payload: FcmSendPayload,
  absoluteUrl?: string,
): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload.data ?? {})) {
    if (value != null) data[key] = String(value);
  }
  if (absoluteUrl) data.link = absoluteUrl;
  if (payload.title) data.title = payload.title;
  if (payload.body) data.body = payload.body;
  return data;
}

function isInvalidTokenError(errorCode: unknown): boolean {
  const code = String(errorCode ?? '');
  return (
    code.includes('UNREGISTERED') ||
    code.includes('INVALID_ARGUMENT') ||
    code.includes('NOT_FOUND') ||
    code.includes('SENDER_ID_MISMATCH')
  );
}

async function sendToToken(
  token: string,
  payload: FcmSendPayload,
  absoluteUrl: string | undefined,
  accessToken: string,
  projectId: string,
): Promise<{ ok: boolean; messageId?: string; error?: string; invalid?: boolean; retryable?: boolean }> {
  // Include a notification payload for reliable Web Push delivery in background.
  // The SW still receives `data` so clicks can route to the right in-app screen.
  const data = buildStringData(payload, absoluteUrl);
  const message: Record<string, unknown> = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data,
    webpush: {
      headers: {
        Urgency: 'high',
      },
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data,
      },
      fcm_options: absoluteUrl ? { link: absoluteUrl } : undefined,
    },
  };

  if (typeof payload.iosBadgeCount === 'number') {
    message.apns = {
      payload: {
        aps: {
          badge: payload.iosBadgeCount,
          // Keep alert for APNs consumers; web ignores apns.
          alert: {
            title: payload.title,
            body: payload.body,
          },
        },
      },
    };
  }

  let lastError = 'FCM send failed';
  let lastRetryable = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        },
      );

      const result = await response.json().catch(() => ({}));
      if (response.ok && typeof result?.name === 'string') {
        return { ok: true, messageId: result.name };
      }

      const errorCode = result?.error?.details?.[0]?.errorCode ?? result?.error?.status;
      const errorMessage =
        (typeof result?.error?.message === 'string' ? result.error.message : null) ??
        `FCM HTTP ${response.status}`;

      if (isInvalidTokenError(errorCode) || isInvalidTokenError(errorMessage)) {
        return { ok: false, error: errorMessage, invalid: true, retryable: false };
      }

      lastError = errorMessage;
      lastRetryable = RETRYABLE_STATUS.has(response.status);
      if (!lastRetryable || attempt === MAX_RETRIES - 1) {
        return { ok: false, error: lastError, retryable: lastRetryable };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'FCM network error';
      lastRetryable = true;
      if (attempt === MAX_RETRIES - 1) {
        return { ok: false, error: lastError, retryable: true };
      }
    }

    await sleep(400 * (attempt + 1));
  }

  return { ok: false, error: lastError, retryable: lastRetryable };
}

export async function sendFcmNotification(
  payload: FcmSendPayload,
  appUrl: string,
): Promise<FcmSendResult> {
  const config = getFcmConfig();
  if (!isFcmConfigured()) {
    return { ok: false, error: 'FCM no configurado' };
  }

  const tokens = [...new Set((payload.tokens ?? []).filter(Boolean).map(String))];
  if (tokens.length === 0) {
    return { ok: false, error: 'No recipients' };
  }

  const absoluteUrl = resolveAbsoluteLink(payload, appUrl);

  let accessToken: string;
  try {
    accessToken = await getAccessToken(config);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'FCM auth failed',
      retryable: true,
    };
  }

  const messageIds: string[] = [];
  const invalidTokens: string[] = [];
  let successCount = 0;
  let lastError: string | undefined;

  for (const token of tokens) {
    const result = await sendToToken(token, payload, absoluteUrl, accessToken, config.projectId);
    if (result.ok) {
      successCount += 1;
      if (result.messageId) messageIds.push(result.messageId);
    } else {
      lastError = result.error;
      if (result.invalid) invalidTokens.push(token);
    }
  }

  if (successCount === 0) {
    return {
      ok: false,
      error: lastError ?? 'FCM no entregó a ningún dispositivo',
      recipients: 0,
      invalidTokens,
      messageIds,
      retryable: false,
    };
  }

  return {
    ok: true,
    messageIds,
    recipients: successCount,
    invalidTokens,
  };
}
