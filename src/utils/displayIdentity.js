import { isPersonalAuthor } from '../constants/authorTypes';
import {
  avatarTypeFromAuthorType,
  avatarTypeFromRole,
  resolveAvatarImageSrc,
} from '../constants/avatarDefaults';
import { supabase } from '../config/supabase';
import { ROLES, isEmployerRole } from '../constants/roles';
import { extractGoogleProfile } from './googleProfile';
import { isOrganizationProfile } from './orgLabels';
import { reportError } from './logger';

const warnedKeys = new Set();

/** Derive a human-readable name from email — bootstrap only, never shown as UI placeholder. */
export function nameFromEmail(email) {
  const handle = String(email ?? '')
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .trim();
  if (!handle) return '';
  return handle.replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Read identity fields stored on auth.users at registration (email or OAuth). */
export function readIdentityFromUser(user) {
  const meta = user?.user_metadata ?? {};
  const google = extractGoogleProfile(user);

  return {
    full_name: String(meta.full_name || meta.name || google.full_name || '').trim() || null,
    company_name: String(meta.company_name || '').trim() || null,
    sector: String(meta.sector || '').trim() || null,
    company_type: String(meta.company_type || '').trim() || null,
    city: String(meta.city || '').trim() || null,
    email: user?.email || google.email || null,
  };
}

function resolveAccountType(accountTypeOrRole, profile) {
  if (accountTypeOrRole === ROLES.ORGANIZATION) return ROLES.ORGANIZATION;
  if (accountTypeOrRole === ROLES.BUSINESS) return ROLES.BUSINESS;
  if (isEmployerRole(accountTypeOrRole)) {
    return profile && isOrganizationProfile(profile) ? ROLES.ORGANIZATION : ROLES.BUSINESS;
  }
  return ROLES.PERSONAL;
}

function isEmployerAccount(accountType) {
  return accountType === ROLES.BUSINESS || accountType === ROLES.ORGANIZATION || isEmployerRole(accountType);
}

export function warnMissingDisplayName(context, details = {}) {
  const key = `${context}:${details.userId ?? details.authorId ?? 'unknown'}`;
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);

  if (import.meta.env.DEV) {
    console.warn('[TrabaGE] Missing display name', { context, ...details });
  }

  reportError(new Error('Missing display name'), {
    area: 'display_identity',
    context,
    ...details,
  });
}

/**
 * Single source of truth for user-visible display names.
 * Returns empty string when unknown — never a placeholder label.
 */
export function getDisplayName(profile, accountTypeOrRole, options = {}) {
  const {
    user = null,
    authorType = null,
    context = 'display',
    warnIfMissing = false,
    fallbackAuthorName = null,
    profileOnly = false,
  } = options;

  const accountType = resolveAccountType(accountTypeOrRole, profile);
  const employer =
    isEmployerAccount(accountType) ||
    (!isPersonalAuthor(authorType) && authorType != null && authorType !== 'personal' && authorType !== 'candidate');

  let name = '';

  if (employer) {
    name = profile?.company_name?.trim() || '';
    if (!name && user && !profileOnly) {
      name = readIdentityFromUser(user).company_name || '';
    }
  } else {
    name = profile?.full_name?.trim() || '';
    if (!name && user && !profileOnly) {
      const identity = readIdentityFromUser(user);
      name = identity.full_name || nameFromEmail(identity.email) || '';
    }
  }

  if (!name && fallbackAuthorName) {
    name = String(fallbackAuthorName).trim();
  }

  if (!name && warnIfMissing) {
    warnMissingDisplayName(context, {
      userId: profile?.user_id,
      accountType,
      authorType,
    });
  }

  return name;
}

/** Resolve avatar image for a profile + account type. */
export function getDisplayAvatar(profile, accountTypeOrRole, options = {}) {
  const { authorType = null } = options;
  const accountType = resolveAccountType(accountTypeOrRole, profile);

  const type = authorType
    ? avatarTypeFromAuthorType(authorType, {
        companyType: profile?.company_type,
        profile,
      })
    : avatarTypeFromRole(accountType, { companyType: profile?.company_type, profile });

  const path = isPersonalAuthor(authorType) || accountType === ROLES.PERSONAL
    ? profile?.avatar_path
    : profile?.logo_path;

  return resolveAvatarImageSrc(type, path);
}

/** Resolve author display name for feed/post surfaces (live profile + denormalized fallback). */
export function resolvePostAuthorName(post, profile, accountTypeOrRole) {
  return getDisplayName(profile, accountTypeOrRole, {
    authorType: post?.author_type,
    fallbackAuthorName: post?.author_name,
    context: 'post_author',
  });
}

/** Keep auth.users metadata aligned when profile identity fields change. */
export async function syncAuthIdentityMetadata(partial) {
  const data = {};
  if (partial?.full_name?.trim()) data.full_name = partial.full_name.trim();
  if (partial?.company_name?.trim()) data.company_name = partial.company_name.trim();

  if (Object.keys(data).length === 0) return;

  try {
    await supabase.auth.updateUser({ data });
  } catch {
    // Non-blocking — profile row remains source of truth.
  }
}
