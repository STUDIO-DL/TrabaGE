import { isEmployerAuthor, isPersonalAuthor } from '../constants/authorTypes';
import { DEEP_LINK_PATHS } from './deepLinks';
import { ROLES, isEmployerRole, isPersonalRole, rolePath } from '../constants/roles';

/** Normalize legacy + current global_search result_type values. */
export function normalizeSearchEntityType(type) {
  if (type === 'candidate') return 'personal';
  if (type === 'company') return 'business';
  if (type === 'institution') return 'organization';
  return type;
}

/** Map author/account labels used across the app to search entity types. */
export function accountTypeToSearchEntityType(accountType) {
  if (isPersonalAuthor(accountType) || accountType === 'personal') return 'personal';
  if (accountType === 'organization' || accountType === 'institution') return 'organization';
  if (isEmployerAuthor(accountType) || accountType === 'business') return 'business';
  return normalizeSearchEntityType(accountType);
}

/**
 * Build the in-app profile URL for a search result or directory entry.
 * Uses auth.users.id (user_id) — never profile row ids.
 *
 * @param {{ type: string, id: string, viewer?: { id?: string, role?: string } | null }} params
 */
export function buildProfilePathFromSearchResult({ type, id, viewer = null }) {
  const entityType = normalizeSearchEntityType(type);
  const targetId = id == null ? '' : String(id).trim();

  if (!targetId) {
    throw new Error(`Cannot build profile path: missing id for "${entityType}" search result`);
  }

  if (entityType === 'personal') {
    const isOwner = isPersonalRole(viewer?.role) && viewer?.id === targetId;
    return isOwner ? rolePath(ROLES.PERSONAL, '/profile') : DEEP_LINK_PATHS.profile(targetId);
  }

  if (entityType === 'business' || entityType === 'organization') {
    const isOwner = isEmployerRole(viewer?.role) && viewer?.id === targetId;
    if (isOwner) {
      const ownerRole =
        viewer?.role === ROLES.ORGANIZATION || entityType === 'organization'
          ? ROLES.ORGANIZATION
          : ROLES.BUSINESS;
      return rolePath(ownerRole, '/profile');
    }
    return DEEP_LINK_PATHS.company(targetId);
  }

  if (entityType === 'job') {
    return isPersonalRole(viewer?.role)
      ? `/personal/jobs/${targetId}`
      : DEEP_LINK_PATHS.job(targetId);
  }

  throw new Error(`Cannot build profile path: unsupported search entity type "${entityType}"`);
}

/** Resolve path from a mapped search row or raw RPC row plus optional viewer. */
export function resolveSearchResultPath(item, viewer = null) {
  return buildProfilePathFromSearchResult({
    type: item?.type ?? item?.result_type,
    id: item?.id ?? item?.result_id,
    viewer,
  });
}

/**
 * Public profile path for feed/cards/admin (viewer=null → always public deep link).
 * @param {string} userId auth.users.id
 * @param {string} [userType='personal'] personal | business | organization | legacy aliases
 */
export function getUserProfilePath(userId, userType = 'personal', viewer = null) {
  if (!userId) return null;
  try {
    return buildProfilePathFromSearchResult({
      type: accountTypeToSearchEntityType(userType),
      id: userId,
      viewer,
    });
  } catch {
    return null;
  }
}
