import { Resend } from 'npm:resend@4';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

const DEFAULT_SENDER_NAME = 'TrabaGE';
const DEFAULT_AUTH_FROM_EMAIL = 'noreply@trabage.org';
const DEFAULT_WELCOME_FROM_EMAIL = 'welcome@trabage.org';

function getSenderName() {
  return Deno.env.get('RESEND_FROM_NAME')?.trim()
    || Deno.env.get('SMTP_FROM_NAME')?.trim()
    || DEFAULT_SENDER_NAME;
}

function formatFromAddress(email: string) {
  return `${getSenderName()} <${email}>`;
}

/** Verification, recovery and other auth emails. */
export function getResendAuthFromAddress() {
  const email = Deno.env.get('RESEND_AUTH_FROM_EMAIL')?.trim()
    || Deno.env.get('RESEND_FROM_EMAIL')?.trim()
    || Deno.env.get('SMTP_FROM_EMAIL')?.trim()
    || DEFAULT_AUTH_FROM_EMAIL;
  return formatFromAddress(email);
}

/** Post-signup welcome emails. */
export function getResendWelcomeFromAddress() {
  const email = Deno.env.get('RESEND_WELCOME_FROM_EMAIL')?.trim()
    || DEFAULT_WELCOME_FROM_EMAIL;
  return formatFromAddress(email);
}

function getResendApiKey() {
  const key = Deno.env.get('RESEND_API_KEY')?.trim();
  if (!key) {
    throw new Error('RESEND_API_KEY no configurado');
  }
  return key;
}

export function formatResendError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export async function sendViaResend(options: SendEmailOptions) {
  const resend = new Resend(getResendApiKey());
  const { data, error } = await resend.emails.send({
    from: options.from ?? getResendAuthFromAddress(),
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    throw new Error(formatResendError(error));
  }

  return data;
}
