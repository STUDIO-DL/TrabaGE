import { resolveCompanyCoverUrl } from '../utils/storagePaths';
import {
  AvatarType,
  DEFAULT_COMPANY_LOGO,
  DEFAULT_ORGANIZATION_LOGO,
  DEFAULT_USER_AVATAR,
  avatarTypeFromCompanyProfile,
  resolveAvatarSrc,
} from './avatarDefaults';

export {
  AvatarType,
  DEFAULT_USER_AVATAR,
  DEFAULT_COMPANY_LOGO,
  DEFAULT_ORGANIZATION_LOGO,
} from './avatarDefaults';

export function getCompanyLogoUrl(logoPath, options = {}) {
  const type =
    typeof options === 'string'
      ? options
      : options.accountType ??
        avatarTypeFromCompanyProfile(options.profile ?? { company_type: options.companyType });

  return resolveAvatarSrc(type, logoPath);
}

export function getCompanyCoverUrl(coverPath) {
  if (!coverPath?.trim()) return null;
  if (coverPath.trim().startsWith('http')) return coverPath.trim();
  return resolveCompanyCoverUrl(coverPath) || coverPath;
}

export function hasCompanyCover(coverUrl) {
  return Boolean(coverUrl?.trim());
}
