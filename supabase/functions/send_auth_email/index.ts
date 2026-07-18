import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { sendViaResend, formatResendError, getResendAuthFromAddress } from '../_shared/resend.ts';
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
  return secret.replace(/^v1,whsec_/, '');
}

function jsonError(message: string, status: number) {
  return new Response(
    JSON.stringify({
      error: {
        message,
      },
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
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
    return jsonError(message, 401);
  }

  if (!payload.user?.email) {
    return jsonError('Email de destino ausente', 400);
  }

  try {
    const emailContent = buildAuthEmail(payload);

    await sendViaResend({
      from: getResendAuthFromAddress(),
      to: payload.user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    console.log(
      '[send_auth_email] sent:',
      payload.user.email,
      payload.email_data.email_action_type,
    );

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = formatResendError(error);
    console.error('[send_auth_email] send error:', message);
    return jsonError(message, 502);
  }
});
