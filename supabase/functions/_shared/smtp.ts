import nodemailer from 'npm:nodemailer@6';
import type { SendEmailOptions } from './resend.ts';

const DEFAULT_SENDER_NAME = 'TrabaGE';
const DEFAULT_FROM_EMAIL = 'noreply@trabage.org';

function getSmtpFromAddress() {
  const email = Deno.env.get('SMTP_FROM_EMAIL')?.trim()
    || Deno.env.get('SMTP_ADMIN_EMAIL')?.trim()
    || Deno.env.get('RESEND_AUTH_FROM_EMAIL')?.trim()
    || DEFAULT_FROM_EMAIL;
  const name = Deno.env.get('SMTP_FROM_NAME')?.trim()
    || Deno.env.get('SMTP_SENDER_NAME')?.trim()
    || Deno.env.get('RESEND_FROM_NAME')?.trim()
    || DEFAULT_SENDER_NAME;
  return `${name} <${email}>`;
}

export function isSmtpConfigured() {
  const host = Deno.env.get('SMTP_HOST')?.trim();
  const user = Deno.env.get('SMTP_USER')?.trim();
  const pass = Deno.env.get('SMTP_PASS')?.trim();
  return Boolean(host && user && pass);
}

export async function sendViaSmtp(options: SendEmailOptions) {
  const port = Number(Deno.env.get('SMTP_PORT')?.trim() || '587');
  const secure = Deno.env.get('SMTP_SECURE')?.trim() === 'true' || port === 465;

  const transporter = nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST')!.trim(),
    port,
    secure,
    auth: {
      user: Deno.env.get('SMTP_USER')!.trim(),
      pass: Deno.env.get('SMTP_PASS')!.trim(),
    },
  });

  await transporter.sendMail({
    from: options.from ?? getSmtpFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
