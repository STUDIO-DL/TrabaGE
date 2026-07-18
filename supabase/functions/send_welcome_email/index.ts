import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { formatResendError, getResendWelcomeFromAddress, sendViaResend } from '../_shared/resend.ts';
import type { WelcomeAccountType } from './constants.ts';
import {
  buildWelcomeEmailContent,
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
} from './emailTemplate.ts';
import { resolveWelcomeAccountType } from './resolveAccountType.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('TRABAGE_ALLOWED_ORIGIN') ?? 'https://trabage.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-welcome-webhook-secret',
  'Vary': 'Origin',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isAuthorizedWebhook(req: Request) {
  const expected = Deno.env.get('WELCOME_WEBHOOK_SECRET')?.trim();
  if (!expected) return false;
  return req.headers.get('x-welcome-webhook-secret') === expected;
}

function isAuthorizedServiceRole(req: Request, serviceRoleKey: string) {
  const authHeader = req.headers.get('Authorization') ?? '';
  return authHeader === `Bearer ${serviceRoleKey}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAccountReady(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  app_metadata?: { provider?: string; providers?: string[] };
}) {
  if (!user.email || !isValidEmail(user.email)) {
    return false;
  }

  if (user.email_confirmed_at || user.confirmed_at) {
    return true;
  }

  const provider = user.app_metadata?.provider ??
    user.app_metadata?.providers?.[0] ??
    '';

  return provider !== '' && provider !== 'email';
}

async function logWelcomeEmailEvent(
  admin: SupabaseClient,
  userId: string,
  status: 'sent' | 'failed' | 'skipped',
  details?: {
    email?: string;
    error?: string;
    reason?: string;
    accountType?: WelcomeAccountType;
    accountTypeSource?: string;
  },
) {
  try {
    await admin.from('welcome_email_logs').insert({
      user_id: userId,
      status,
      email: details?.email ?? null,
      account_type: details?.accountType ?? null,
      error_message: details?.error ?? details?.reason ?? null,
    });
  } catch (logError) {
    console.error('[send_welcome_email] log error:', logError);
  }
}

async function sendWelcomeEmail(
  to: string,
  userName: string,
  accountType: WelcomeAccountType,
) {
  const content = buildWelcomeEmailContent(accountType, userName);

  await sendViaResend({
    from: getResendWelcomeFromAddress(),
    to,
    subject: content.subject,
    text: buildWelcomeEmailText(content),
    html: buildWelcomeEmailHtml(content),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase no configurado' }, 500);
    }

    if (!isAuthorizedWebhook(req) && !isAuthorizedServiceRole(req, serviceRoleKey)) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    const payload = await req.json();
    const webhookRecord = payload?.record ?? payload;
    const userId = String(webhookRecord?.user_id ?? payload?.user_id ?? '').trim();

    if (!userId) {
      return jsonResponse({ error: 'user_id requerido' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: claimed, error: claimError } = await admin.rpc('claim_welcome_email_send', {
      p_user_id: userId,
    });

    if (claimError) {
      console.error('[send_welcome_email] claim error:', claimError.message);
      return jsonResponse({ error: 'No se pudo reservar el envío' }, 500);
    }

    if (!claimed) {
      console.log('[send_welcome_email] skipped (already sent):', userId);
      await admin.from('welcome_email_outbox').delete().eq('user_id', userId);
      await logWelcomeEmailEvent(admin, userId, 'skipped', { reason: 'already_sent' });
      return jsonResponse({ ok: true, skipped: true, reason: 'already_sent' });
    }

    let email = String(webhookRecord?.email ?? '').trim();
    let userName = String(webhookRecord?.user_name ?? '').trim();
    const outboxAccountType = webhookRecord?.account_type ?? null;

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      await admin.rpc('release_welcome_email_claim', { p_user_id: userId });
      await logWelcomeEmailEvent(admin, userId, 'failed', { error: 'Usuario no encontrado' });
      return jsonResponse({ error: 'Usuario no encontrado' }, 404);
    }

    if (!email) {
      email = String(userData.user.email ?? '').trim();
    }

    if (!userName) {
      userName = String(
        userData.user.user_metadata?.full_name ?? userData.user.user_metadata?.name ?? '',
      ).trim();
    }

    if (!email || !isValidEmail(email)) {
      await admin.rpc('release_welcome_email_claim', { p_user_id: userId });
      await logWelcomeEmailEvent(admin, userId, 'failed', { error: 'Email inválido o ausente' });
      return jsonResponse({ error: 'Email inválido o ausente' }, 400);
    }

    if (!isAccountReady(userData.user)) {
      await admin.rpc('release_welcome_email_claim', { p_user_id: userId });
      await logWelcomeEmailEvent(admin, userId, 'failed', {
        email,
        error: 'Cuenta no confirmada',
      });
      return jsonResponse({ error: 'Cuenta no confirmada' }, 409);
    }

    const resolved = await resolveWelcomeAccountType(admin, userId, outboxAccountType);
    const accountType = resolved.accountType;

    if (resolved.resolutionError) {
      console.error(
        '[send_welcome_email] using personal fallback:',
        userId,
        resolved.resolutionError,
      );
    }

    console.log(
      '[send_welcome_email] resolved account type:',
      userId,
      accountType,
      'source=',
      resolved.source,
    );

    try {
      await sendWelcomeEmail(email, userName, accountType);
    } catch (sendError) {
      const errorMessage = formatResendError(sendError);
      await admin.rpc('release_welcome_email_claim', { p_user_id: userId });
      console.error('[send_welcome_email] Resend error:', errorMessage);
      await logWelcomeEmailEvent(admin, userId, 'failed', {
        email,
        accountType,
        error: errorMessage,
      });
      return jsonResponse({ error: 'No se pudo enviar el correo de bienvenida' }, 502);
    }

    await admin.from('welcome_email_outbox').delete().eq('user_id', userId);
    console.log('[send_welcome_email] sent:', userId, email, accountType);
    await logWelcomeEmailEvent(admin, userId, 'sent', {
      email,
      accountType,
      accountTypeSource: resolved.source,
    });

    return jsonResponse({
      ok: true,
      sent: true,
      user_id: userId,
      account_type: accountType,
      account_type_source: resolved.source,
    });
  } catch (error) {
    console.error('[send_welcome_email] unexpected:', error);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});
