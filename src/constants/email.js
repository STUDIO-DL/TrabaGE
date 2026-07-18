/** Official TrabaGE email sender — Resend (welcome) or Supabase SMTP (auth verification fallback). */
export const EMAIL_SENDER_NAME = 'TrabaGE';

/** Auth emails: verification, password recovery. */
export const DEFAULT_AUTH_FROM_EMAIL = 'noreply@trabage.org';

/** Welcome email after account confirmation. */
export const DEFAULT_WELCOME_FROM_EMAIL = 'welcome@trabage.org';

/** @deprecated Use DEFAULT_AUTH_FROM_EMAIL or DEFAULT_WELCOME_FROM_EMAIL. */
export const PRODUCTION_AUTH_FROM_EMAIL = DEFAULT_AUTH_FROM_EMAIL;
