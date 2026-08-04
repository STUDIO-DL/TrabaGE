import DefaultAvatarPng from '../assets/images/default_avatar.png';
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

/** Official TrabaGE default for personal profiles (and any missing photo). */
export const DEFAULT_AVATAR_PNG = DefaultAvatarPng;

export const DEFAULT_AVATAR_SRC = {
  [AvatarType.PERSONAL]: DefaultAvatarPng,
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
  // Reject obvious non-image junk that would produce a broken <img>.
  if (/^(true|false|0|1|\{\}|\[\]|nan)$/i.test(trimmed)) return false;
  return true;
}

/** Bundled default assets — never treat as Supabase storage paths. */
export function isBundledAvatarAsset(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  const defaults = Object.values(DEFAULT_AVATAR_SRC);
  if (defaults.some((src) => src && trimmed === src)) return true;

  if (trimmed.startsWith('data:image/')) return false;
  if (trimmed.startsWith('blob:')) return false;

  if (
    /\/assets\/default-(personal|business|organization)/i.test(trimmed) ||
    /default-(personal|business|organization)\.svg/i.test(trimmed) ||
    /default_avatar\.(png|svg|webp)/i.test(trimmed)
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
 * Returns { src, isDefault } — when isDefault, src is null (AppAvatar shows official default).
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
    // Guard against incomplete storage public URLs that always 404.
    if (/\/storage\/v1\/object\/public\/[^/]+\/?\s*$/i.test(trimmed)) {
      return { src: null, isDefault: true };
    }
    // Rebuild storage URLs so ?v= cache-bust tokens survive consistently.
    const rebuilt =
      type === AvatarType.PERSONAL ? resolveAvatarUrl(trimmed) : resolveLogoUrl(trimmed);
    return { src: rebuilt || trimmed, isDefault: false };
  }

  // Absolute site paths are never storage keys
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

/** Concrete src string (official default when missing). */
export function resolveAvatarSrc(type, imagePath) {
  const resolved = resolveAvatarImageSrc(type, imagePath);
  return resolved.src ?? getDefaultAvatarSrc(type);
}

/**
 * Raw path or remote URL for AppAvatar — never a bundled default, never a
 * pre-built storage URL. AppAvatar is the only place that resolves storage paths.
 */
export function resolveAuthorAvatar(authorType, { avatarPath, logoPath, companyType, profile } = {}) {
  const type = avatarTypeFromAuthorType(authorType, { companyType, profile });
  const path = isPersonalAuthor(authorType) ? avatarPath : logoPath;
  const resolved = resolveAvatarImageSrc(type, path);
  if (resolved.isDefault) return null;
  // Prefer the original input so AppAvatar remains the single resolver.
  if (typeof path === 'string' && path.trim()) return path.trim();
  return resolved.src;
}
