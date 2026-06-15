/** Static assets served from /public */
export const DEFAULT_COMPANY_LOGO = '/images/default-company-logo.png';
export const DEFAULT_USER_AVATAR = '/images/default-user-avatar.png';

export function getCompanyLogoUrl(logoUrl) {
  return logoUrl || DEFAULT_COMPANY_LOGO;
}

export function getCompanyCoverUrl(coverUrl) {
  if (!coverUrl?.trim()) return null;
  return coverUrl;
}

export function hasCompanyCover(coverUrl) {
  return Boolean(coverUrl?.trim());
}
