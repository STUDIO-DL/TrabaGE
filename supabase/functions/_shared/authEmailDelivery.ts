import type { SendEmailOptions } from './resend.ts';
import { formatResendError, getResendAuthFromAddress, isResendConfigured, sendViaResend } from './resend.ts';
import { isSmtpConfigured, sendViaSmtp } from './smtp.ts';

export type AuthEmailProvider = 'resend' | 'supabase_smtp';

export type AuthEmailDeliveryResult = {
  provider: AuthEmailProvider;
  messageId?: string | null;
};

export function resolveAuthEmailProvider(): AuthEmailProvider | null {
  if (isResendConfigured()) return 'resend';
  if (isSmtpConfigured()) return 'supabase_smtp';
  return null;
}

/**
 * Same delivery as deliverAuthEmail, plus optional Resend message id for logging.
 * Existing callers can keep using deliverAuthEmail (provider string only).
 */
export async function deliverAuthEmailDetailed(
  options: SendEmailOptions,
): Promise<AuthEmailDeliveryResult> {
  if (isResendConfigured()) {
    const data = await sendViaResend({
      ...options,
      from: options.from ?? getResendAuthFromAddress(),
    });
    const messageId =
      data && typeof data === 'object' && 'id' in data
        ? String((data as { id?: string }).id || '') || null
        : null;
    return { provider: 'resend', messageId };
  }

  if (isSmtpConfigured()) {
    await sendViaSmtp(options);
    return { provider: 'supabase_smtp', messageId: null };
  }

  throw new Error(
    'Verificación por correo no configurada: añade RESEND_API_KEY o SMTP_HOST/SMTP_USER/SMTP_PASS ' +
    'en Edge Functions → Secrets. Sin Resend, usa las mismas credenciales SMTP que Authentication → SMTP.',
  );
}

export async function deliverAuthEmail(options: SendEmailOptions): Promise<AuthEmailProvider> {
  const result = await deliverAuthEmailDetailed(options);
  return result.provider;
}

export { formatResendError };
