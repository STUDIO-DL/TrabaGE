/** Official TrabaGE email sender (dev phase). Change SMTP_FROM_EMAIL in Supabase secrets for production domain. */
export const EMAIL_SENDER_NAME = 'TrabaGE';

export const DEFAULT_AUTH_FROM_EMAIL = 'noreply.trabage@gmail.com';

/** Future production sender — set via Supabase SMTP / Edge Function secrets only. */
export const PRODUCTION_AUTH_FROM_EMAIL = 'noreply@trabage.org';
