import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { deliverAuthEmail, formatResendError } from '../_shared/authEmailDelivery.ts';
import {
  buildRecoveryConfirmUrl,
  buildRecoveryEmail,
  buildSignupConfirmUrl,
  buildSignupVerificationEmail,
  extractFirstName,
} from './templates.ts';

interface AuthEmailPayload {
  user: {
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
}

function getHookSecret() {
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')?.trim();
  if (!secret) {
    throw new Error('SEND_EMAIL_HOOK_SECRET no configurado');
  }
  return secret.startsWith('v1,whsec_') ? secret.slice('v1,whsec_'.length) : secret;
}

/** Supabase Auth only reads hook error bodies on HTTP 200/202 — not on 4xx/5xx. */
function hookErrorResponse(message: string, httpCode = 500) {
  return new Response(
    JSON.stringify({
      error: {
        http_code: httpCode,
        message,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

function hookSuccessResponse() {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildAuthEmail(payload: AuthEmailPayload) {
  const { email_data: emailData } = payload;
  const actionType = emailData.email_action_type;

  if (actionType === 'signup' || actionType === 'email') {
    const verificationUrl = buildSignupConfirmUrl(emailData.redirect_to, emailData.token_hash);
    const firstName = extractFirstName(payload.user.user_metadata);
    return buildSignupVerificationEmail(verificationUrl, firstName);
  }

  if (actionType === 'recovery') {
    const recoveryUrl = buildRecoveryConfirmUrl(
      emailData.site_url,
      emailData.redirect_to,
      emailData.token_hash,
    );
    return buildRecoveryEmail(recoveryUrl);
  }

  throw new Error(`Tipo de correo auth no soportado: ${actionType}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: AuthEmailPayload;
  try {
    const payloadText = await req.text();
    const headers = Object.fromEntries(req.headers);
    const webhook = new Webhook(getHookSecret());
    payload = webhook.verify(payloadText, headers) as AuthEmailPayload;
  } catch (error) {
    const message = formatResendError(error);
    console.error('[send_auth_email] hook verification error:', message);
    return hookErrorResponse(
      message.includes('no configurado')
        ? message
        : 'Secreto del hook de correo inválido. Revisa SEND_EMAIL_HOOK_SECRET en Supabase.',
      401,
    );
  }

  if (!payload.user?.email) {
    return hookErrorResponse('Email de destino ausente', 400);
  }

  try {
    const emailContent = buildAuthEmail(payload);
    const provider = await deliverAuthEmail({
      to: payload.user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    console.log(
      '[send_auth_email] sent:',
      payload.user.email,
      payload.email_data.email_action_type,
      `via ${provider}`,
    );

    return hookSuccessResponse();
  } catch (error) {
    const message = formatResendError(error);
    console.error('[send_auth_email] send error:', message);
    return hookErrorResponse(message, 502);
  }
});
