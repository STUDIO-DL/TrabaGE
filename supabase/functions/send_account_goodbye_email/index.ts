import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { deliverAuthEmailDetailed, formatResendError } from '../_shared/authEmailDelivery.ts';
import { buildGoodbyeEmail } from '../send_auth_email/templates.ts';

const ALLOWED_ORIGINS = new Set(
  [
    Deno.env.get('TRABAGE_ALLOWED_ORIGIN')?.trim(),
    'https://trabage.org',
    'https://www.trabage.org',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean) as string[],
);

function corsHeadersFor(req: Request) {
  const origin = req.headers.get('Origin')?.trim() || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : (Deno.env.get('TRABAGE_ALLOWED_ORIGIN')?.trim() || 'https://trabage.org');

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-account-goodbye-webhook-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

function getEnv(name: string) {
  return Deno.env.get(name)?.trim() || '';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isAuthorizedWebhook(req: Request) {
  const expected = getEnv('ACCOUNT_GOODBYE_WEBHOOK_SECRET');
  if (!expected) return false;
  return req.headers.get('x-account-goodbye-webhook-secret') === expected;
}

function isAuthorizedServiceRole(req: Request, serviceRoleKey: string) {
  const authHeader = req.headers.get('Authorization') ?? '';
  return authHeader === `Bearer ${serviceRoleKey}`;
}

function extractToken(body: Record<string, unknown> | null): string {
  if (!body || typeof body !== 'object') return '';

  const direct = String(body.token ?? body.goodbye_token ?? '').trim();
  if (direct) return direct;

  // Database Webhook / pg_net payload shapes.
  const record = (body.record ?? body.new ?? null) as Record<string, unknown> | null;
  if (record && typeof record === 'object') {
    return String(record.send_token ?? record.token ?? '').trim();
  }

  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { ok: false }, 405);
  }

  const supabaseUrl = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnv('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[send_account_goodbye_email] missing Supabase env');
    return jsonResponse(req, { ok: false }, 200);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, { ok: false }, 200);
  }

  const token = extractToken(body);
  if (!token || !isUuid(token)) {
    return jsonResponse(req, { ok: false }, 200);
  }

  // Auth: one-time outbox token is the real credential (verify_jwt=false).
  // Optional webhook/service-role headers are accepted for server-side dispatch.
  const authHeader = req.headers.get('Authorization') ?? '';
  const hasAnonOrService =
    authHeader === `Bearer ${serviceRoleKey}` ||
    (anonKey && authHeader === `Bearer ${anonKey}`) ||
    isAuthorizedWebhook(req) ||
    isAuthorizedServiceRole(req, serviceRoleKey);

  // Allow unauthenticated token redeem too (token itself is secret + single-use).
  // hasAnonOrService is only logged for ops visibility.
  if (!hasAnonOrService) {
    console.log('[send_account_goodbye_email] redeem via outbox token only');
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Claim pending row (single-use token). Also reclaim stuck "processing" > 10 min.
  let claimed: { id: string; email: string; account_type: string } | null = null;

  const { data: pendingClaim, error: claimError } = await admin
    .from('account_goodbye_email_outbox')
    .update({ status: 'processing' })
    .eq('send_token', token)
    .eq('status', 'pending')
    .select('id, email, account_type')
    .maybeSingle();

  if (claimError) {
    console.error('[send_account_goodbye_email] claim error:', claimError.message);
    return jsonResponse(req, { ok: false }, 200);
  }

  claimed = pendingClaim;

  if (!claimed) {
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: staleClaim } = await admin
      .from('account_goodbye_email_outbox')
      .update({ status: 'processing' })
      .eq('send_token', token)
      .eq('status', 'processing')
      .lt('created_at', staleBefore)
      .select('id, email, account_type')
      .maybeSingle();
    claimed = staleClaim;
  }

  if (!claimed) {
    // Retry failed rows when client/webhook re-invokes with same token.
    const { data: failedClaim } = await admin
      .from('account_goodbye_email_outbox')
      .update({ status: 'processing', error_message: null })
      .eq('send_token', token)
      .eq('status', 'failed')
      .select('id, email, account_type')
      .maybeSingle();
    claimed = failedClaim;
  }

  if (!claimed) {
    console.log('[send_account_goodbye_email] skipped (invalid, sent, or in-flight token)');
    return jsonResponse(req, { ok: true, skipped: true }, 200);
  }

  const emailContent = buildGoodbyeEmail(claimed.account_type);

  try {
    const delivery = await deliverAuthEmailDetailed({
      to: claimed.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    await admin
      .from('account_goodbye_email_outbox')
      .update({
        status: 'sent',
        processed_at: new Date().toISOString(),
        error_message: null,
        provider_message_id: delivery.messageId ?? null,
      })
      .eq('id', claimed.id);

    await admin.from('account_goodbye_email_logs').insert({
      outbox_id: claimed.id,
      email: claimed.email,
      account_type: claimed.account_type,
      status: 'sent',
      provider_message_id: delivery.messageId ?? null,
    });

    console.log(
      '[send_account_goodbye_email] sent:',
      claimed.email,
      claimed.account_type,
      `via ${delivery.provider}`,
      delivery.messageId ? `id=${delivery.messageId}` : '',
    );
    return jsonResponse(req, { ok: true });
  } catch (error) {
    const message = formatResendError(error);
    console.error('[send_account_goodbye_email] send failed:', message);

    await admin
      .from('account_goodbye_email_outbox')
      .update({
        status: 'failed',
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', claimed.id);

    await admin.from('account_goodbye_email_logs').insert({
      outbox_id: claimed.id,
      email: claimed.email,
      account_type: claimed.account_type,
      status: 'failed',
      error_message: message,
    });

    // Account already deleted — never surface provider errors to the client.
    return jsonResponse(req, { ok: false }, 200);
  }
});
