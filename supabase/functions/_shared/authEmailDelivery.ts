import type { SendEmailOptions } from './resend.ts';
import { formatResendError, getResendAuthFromAddress, isResendConfigured, sendViaResend } from './resend.ts';
import { isSmtpConfigured, sendViaSmtp } from './smtp.ts';

export type AuthEmailProvider = 'resend' | 'supabase_smtp';

export function resolveAuthEmailProvider(): AuthEmailProvider | null {
  if (isResendConfigured()) return 'resend';
  if (isSmtpConfigured()) return 'supabase_smtp';
  return null;
}

export async function deliverAuthEmail(options: SendEmailOptions): Promise<AuthEmailProvider> {
  if (isResendConfigured()) {
    await sendViaResend({
      ...options,
      from: options.from ?? getResendAuthFromAddress(),
    });
    return 'resend';
  }

  if (isSmtpConfigured()) {
    await sendViaSmtp(options);
    return 'supabase_smtp';
  }

  throw new Error(
    'Verificación por correo no configurada: añade RESEND_API_KEY o SMTP_HOST/SMTP_USER/SMTP_PASS ' +
    'en Edge Functions → Secrets. Sin Resend, usa las mismas credenciales SMTP que Authentication → SMTP.',
  );
}

export { formatResendError };
