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

const INVALID_PATH_PATTERN = /^(null|undefined|none|n\/a)$/i;

export function getDefaultAvatarSrc(type = AvatarType.PERSONAL) {
  return DEFAULT_AVATAR_SRC[type] ?? DEFAULT_AVATAR_SRC[AvatarType.PERSONAL];
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function isValidImagePath(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (INVALID_PATH_PATTERN.test(trimmed)) return false;
  return true;
}

/** Bundled default SVGs or other static app assets — never treat as storage paths. */
export function isBundledAvatarAsset(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  const defaults = Object.values(DEFAULT_AVATAR_SRC);
  if (defaults.some((src) => src && trimmed === src)) return true;

  if (trimmed.startsWith('data:image/')) return false;
  if (trimmed.startsWith('blob:')) return false;

  // Vite-dev and built asset URLs (e.g. /assets/default-personal-xxxx.svg)
  if (
    /\/assets\/default-(personal|business|organization)/i.test(trimmed) ||
    /default-(personal|business|organization)\.svg/i.test(trimmed)
  ) {
    return true;
  }

  if (trimmed.startsWith('/assets/') || trimmed.startsWith('/src/assets/')) {
    return true;
  }

  return false;
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
 * Returns { src, isDefault } — when isDefault, src is null (AppAvatar renders inline fallback).
 * Use resolveAvatarSrc() when a concrete URL string is required (e.g. PDF export).
 */
export function resolveAvatarImageSrc(type = AvatarType.PERSONAL, imagePath) {
  if (!isValidImagePath(imagePath) || isBundledAvatarAsset(imagePath)) {
    return { src: null, isDefault: true };
  }

  const trimmed = imagePath.trim();

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return { src: trimmed, isDefault: false };
  }

  if (isHttpUrl(trimmed)) {
    if (isBundledAvatarAsset(trimmed)) {
      return { src: null, isDefault: true };
    }
    return { src: trimmed, isDefault: false };
  }

  // Absolute site paths are never storage keys (bundled defaults already handled above)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { src: null, isDefault: true };
  }

  const resolved =
    type === AvatarType.PERSONAL ? resolveAvatarUrl(imagePath) : resolveLogoUrl(imagePath);

  if (resolved) {
    return { src: resolved, isDefault: false };
  }

  return { src: null, isDefault: true };
}

/** Convenience: returns a concrete src string (bundled default when missing). */
export function resolveAvatarSrc(type, imagePath) {
  const resolved = resolveAvatarImageSrc(type, imagePath);
  return resolved.src ?? getDefaultAvatarSrc(type);
}

/**
 * Path or remote URL for AppAvatar — never a bundled default URL
 * (avoids double-resolving defaults as Supabase storage paths).
 */
export function resolveAuthorAvatar(authorType, { avatarPath, logoPath, companyType, profile } = {}) {
  const type = avatarTypeFromAuthorType(authorType, { companyType, profile });
  const path = isPersonalAuthor(authorType) ? avatarPath : logoPath;
  const resolved = resolveAvatarImageSrc(type, path);
  return resolved.isDefault ? null : resolved.src;
}
