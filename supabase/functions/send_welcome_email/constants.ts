/** Official welcome-email account types (matches user_roles.role). */
export type WelcomeAccountType = 'personal' | 'business' | 'organization';

export const WELCOME_ACCOUNT_TYPES: WelcomeAccountType[] = ['personal', 'business', 'organization'];

export const FALLBACK_ACCOUNT_TYPE: WelcomeAccountType = 'personal';

export const EMAIL_SENDER_NAME = 'TrabaGE';

export const DEFAULT_FROM_EMAIL = 'welcome@trabage.org';

export const BRAND_BLUE = '#2563eb';
export const BRAND_BLUE_DARK = '#1d4ed8';
export const TEXT_PRIMARY = '#0f172a';
export const TEXT_MUTED = '#64748b';
export const BORDER = '#e2e8f0';

export const BRAND_SLOGAN = 'Donde las oportunidades te encuentran.';

export const ZARREL_URL = 'https://zarrel.org';
export const ZARREL_NAME = 'ZARREL';

export const DEFAULT_APP_URL = 'https://trabage.org';

export function getAppUrl() {
  const value = Deno.env.get('APP_URL')?.trim();
  return (value || DEFAULT_APP_URL).replace(/\/$/, '');
}

export const CTA_PATHS: Record<WelcomeAccountType, string> = {
  // Land on login first so welcome CTA never hits protected setup routes while
  // the first-session / Google-link race is still settling.
  personal: '/login',
  business: '/login',
  organization: '/login',
};

export function buildCtaUrl(accountType: WelcomeAccountType) {
  return `${getAppUrl()}${CTA_PATHS[accountType]}`;
}

const ORGANIZATION_COMPANY_TYPES = ['Institucion publica', 'ONG'];

export function normalizeWelcomeAccountType(
  role: string | null | undefined,
  options: { companyType?: string | null; accountKind?: string | null } = {},
): WelcomeAccountType | null {
  if (!role) {
    return normalizeWelcomeAccountType(options.accountKind, { companyType: options.companyType });
  }

  const value = String(role).toLowerCase().trim();

  if (value === 'personal' || value === 'candidate') return 'personal';
  if (value === 'organization' || value === 'institution') return 'organization';
  if (value === 'business') return 'business';
  if (value === 'company') {
    const companyType = options.companyType ?? '';
    return ORGANIZATION_COMPANY_TYPES.includes(companyType) ? 'organization' : 'business';
  }

  return null;
}
