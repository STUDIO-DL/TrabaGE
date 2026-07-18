import { getDisplayName } from './displayIdentity';

export const COMPANY_INTRO_MAX_LENGTH = 220;

export const COMPANY_INFO_ROWS = [
  { key: 'company_type', label: 'Tipo de empresa' },
  { key: 'sector', label: 'Sector' },
  { key: 'address', label: 'Dirección' },
  { key: 'country', label: 'País' },
  { key: 'company_size', label: 'Tamaño' },
  { key: 'founded_year', label: 'Fundación' },
  { key: 'website', label: 'Sitio web' },
];

export const COMPANY_DETAIL_ROWS = [
  { key: 'sector', label: 'Sector' },
  { key: 'city', label: 'Ubicación' },
  { key: 'country', label: 'País' },
  { key: 'address', label: 'Dirección' },
  { key: 'company_size', label: 'Tamaño' },
  { key: 'founded_year', label: 'Fundada en' },
  { key: 'website', label: 'Sitio web' },
];

export function displayCompanyValue(value, fallback = '') {
  if (value === null || value === undefined || String(value).trim() === '') {
    return fallback;
  }
  return value;
}

export function getCompanyDisplayName(profile, options = {}) {
  return getDisplayName(profile, options.role, {
    user: options.user,
    context: options.context ?? 'company_profile',
    warnIfMissing: options.warnIfMissing ?? false,
    profileOnly: options.profileOnly ?? false,
  });
}

/** Resolve header-visible company name: DB first, auth metadata on own profile. */
export function resolveCompanyHeaderName(profile, { user, role, readOnly = false } = {}) {
  return getCompanyDisplayName(profile, {
    role,
    user: readOnly ? null : user,
    profileOnly: readOnly,
    warnIfMissing: !readOnly,
    context: readOnly ? 'company_public_profile_header' : 'company_profile_header',
  });
}

export function getCompanySectorText(profile) {
  return profile?.sector?.trim() || null;
}

export function getCompanyIntroText(profile) {
  return profile?.intro?.trim() || null;
}

export function validateCompanyIntro(intro) {
  const trimmed = intro?.trim?.() ?? '';
  if (!trimmed) return null;
  if (trimmed.length > COMPANY_INTRO_MAX_LENGTH) {
    return `Máximo ${COMPANY_INTRO_MAX_LENGTH} caracteres.`;
  }
  return null;
}

export function getCompanyLocationText(profile) {
  const city = profile?.city?.trim();
  const country = profile?.country?.trim();
  const parts = [city, country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function hasCompanyDescription(profile) {
  return Boolean(profile?.description?.trim());
}

export function hasCompanyContact(profile) {
  return Boolean(
    profile?.contact_name?.trim()
    || profile?.contact_email?.trim()
    || profile?.contact_whatsapp?.trim()
    || profile?.contact_phone?.trim(),
  );
}

export function getCompanyContactInitials(profile) {
  const name = profile?.contact_name?.trim();
  if (!name) return '';

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
