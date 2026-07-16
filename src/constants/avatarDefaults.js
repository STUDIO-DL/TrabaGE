import DefaultPersonalAvatar from '../assets/avatars/default-personal.svg';
import DefaultBusinessAvatar from '../assets/avatars/default-business.svg';
import DefaultOrganizationAvatar from '../assets/avatars/default-organization.svg';
import { AUTHOR_TYPES, isPersonalAuthor } from './authorTypes';
import { isOrganizationCompanyType, ROLES } from './roles';
import { isOrganizationProfile } from '../utils/orgLabels';
import { resolveAvatarUrl, resolveLogoUrl } from '../utils/storagePaths';

export const AvatarType = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  ORGANIZATION: 'organization',
};

export const DEFAULT_AVATAR_SRC = {
  [AvatarType.PERSONAL]: DefaultPersonalAvatar,
  [AvatarType.BUSINESS]: DefaultBusinessAvatar,
  [AvatarType.ORGANIZATION]: DefaultOrganizationAvatar,
};

/** @deprecated Use DEFAULT_AVATAR_SRC[AvatarType.PERSONAL] */
export const DEFAULT_USER_AVATAR = DEFAULT_AVATAR_SRC[AvatarType.PERSONAL];

/** @deprecated Use DEFAULT_AVATAR_SRC[AvatarType.BUSINESS] */
export const DEFAULT_COMPANY_LOGO = DEFAULT_AVATAR_SRC[AvatarType.BUSINESS];

/** @deprecated Use DEFAULT_AVATAR_SRC[AvatarType.ORGANIZATION] */
export const DEFAULT_ORGANIZATION_LOGO = DEFAULT_AVATAR_SRC[AvatarType.ORGANIZATION];

export function getDefaultAvatarSrc(type = AvatarType.PERSONAL) {
  return DEFAULT_AVATAR_SRC[type] ?? DEFAULT_AVATAR_SRC[AvatarType.PERSONAL];
}

function isHttpUrl(value) {
  return typeof value === 'string' && value.trim().startsWith('http');
}

function isValidImagePath(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function avatarTypeFromRole(role, { companyType, profile } = {}) {
  if (role === ROLES.ORGANIZATION || role === 'institution') return AvatarType.ORGANIZATION;
  if (role === ROLES.BUSINESS) return AvatarType.BUSINESS;
  if (role === 'company') {
    if (profile && isOrganizationProfile(profile)) return AvatarType.ORGANIZATION;
    return isOrganizationCompanyType(companyType) ? AvatarType.ORGANIZATION : AvatarType.BUSINESS;
  }
  return AvatarType.PERSONAL;
}

export function avatarTypeFromAuthorType(authorType, { companyType, profile } = {}) {
  if (isPersonalAuthor(authorType)) return AvatarType.PERSONAL;
  if (authorType === AUTHOR_TYPES.ORGANIZATION || authorType === 'institution') {
    return AvatarType.ORGANIZATION;
  }
  if (authorType === AUTHOR_TYPES.BUSINESS || authorType === 'company') {
    if (profile && isOrganizationProfile(profile)) return AvatarType.ORGANIZATION;
    return isOrganizationCompanyType(companyType) ? AvatarType.ORGANIZATION : AvatarType.BUSINESS;
  }
  return AvatarType.BUSINESS;
}

export function avatarTypeFromUserType(userType) {
  if (isPersonalAuthor(userType)) return AvatarType.PERSONAL;
  if (userType === AUTHOR_TYPES.ORGANIZATION || userType === 'institution' || userType === 'organization') {
    return AvatarType.ORGANIZATION;
  }
  return AvatarType.BUSINESS;
}

export function avatarTypeFromSearchEntity(type) {
  if (type === 'personal' || type === 'candidate') return AvatarType.PERSONAL;
  if (type === 'organization' || type === 'institution') return AvatarType.ORGANIZATION;
  if (type === 'business' || type === 'company' || type === 'job') return AvatarType.BUSINESS;
  return AvatarType.PERSONAL;
}

export function avatarTypeFromCompanyProfile(profile) {
  if (profile && isOrganizationProfile(profile)) return AvatarType.ORGANIZATION;
  return AvatarType.BUSINESS;
}

/**
 * Resolves a displayable avatar URL with type-specific defaults.
 * Returns { src, isDefault } — callers may pass src to AppAvatar for onError fallback.
 */
export function resolveAvatarImageSrc(type = AvatarType.PERSONAL, imagePath) {
  const defaultSrc = getDefaultAvatarSrc(type);

  if (!isValidImagePath(imagePath)) {
    return { src: defaultSrc, isDefault: true };
  }

  const trimmed = imagePath.trim();

  if (isHttpUrl(trimmed)) {
    return { src: trimmed, isDefault: false };
  }

  const resolved =
    type === AvatarType.PERSONAL ? resolveAvatarUrl(imagePath) : resolveLogoUrl(imagePath);

  if (resolved) {
    return { src: resolved, isDefault: false };
  }

  return { src: defaultSrc, isDefault: true };
}

/** Convenience: returns resolved src string only. */
export function resolveAvatarSrc(type, imagePath) {
  return resolveAvatarImageSrc(type, imagePath).src;
}

export function resolveAuthorAvatar(authorType, { avatarPath, logoPath, companyType, profile } = {}) {
  const type = avatarTypeFromAuthorType(authorType, { companyType, profile });
  const path = isPersonalAuthor(authorType) ? avatarPath : logoPath;
  return resolveAvatarSrc(type, path);
}
