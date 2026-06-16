import { resolveCompanyCoverUrl, resolveLogoUrl } from '../utils/storagePaths';

/** Static assets served from /public */
export const DEFAULT_COMPANY_LOGO = '/images/default-company-logo.png';
export const DEFAULT_USER_AVATAR = '/images/default-user-avatar.png';

export function getCompanyLogoUrl(logoPath) {
  if (typeof logoPath === 'string' && logoPath.trim().startsWith('http')) {
    return logoPath.trim();
  }
  return resolveLogoUrl(logoPath) || DEFAULT_COMPANY_LOGO;
}

export function getCompanyCoverUrl(coverPath) {
  if (!coverPath?.trim()) return null;
  if (coverPath.trim().startsWith('http')) return coverPath.trim();
  return resolveCompanyCoverUrl(coverPath) || coverPath;
}

export function hasCompanyCover(coverUrl) {
  return Boolean(coverUrl?.trim());
}
