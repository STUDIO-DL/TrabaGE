/** Shared constants for profile completion reminder emails. */

export type ReminderAccountType = 'personal' | 'business' | 'organization';

export const BRAND_BLUE = '#2563eb';
export const TEXT_PRIMARY = '#0f172a';
export const TEXT_MUTED = '#64748b';
export const BORDER = '#e2e8f0';
export const BRAND_SLOGAN = 'Donde las oportunidades te encuentran.';
export const SUPPORT_EMAIL = 'support@trabage.org';
export const DEFAULT_APP_URL = 'https://trabage.org';

export const PROFILE_CTA_PATHS: Record<ReminderAccountType, string> = {
  personal: '/personal/profile',
  business: '/business/profile',
  organization: '/organization/profile',
};

export function getAppUrl() {
  const value = Deno.env.get('APP_URL')?.trim();
  return (value || DEFAULT_APP_URL).replace(/\/$/, '');
}

export function buildProfileCtaUrl(accountType: ReminderAccountType) {
  return `${getAppUrl()}${PROFILE_CTA_PATHS[accountType] ?? PROFILE_CTA_PATHS.personal}`;
}

export function escapeHtml(value: string) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatGreeting(userName?: string | null) {
  const name = userName?.trim();
  if (!name) return 'Hola:';
  return `Hola, ${name}:`;
}
