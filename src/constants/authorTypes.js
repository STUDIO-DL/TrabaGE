/**
 * posts.author_type values after account-model migration.
 * Legacy `candidate` / `company` remain readable during transition.
 */
export const AUTHOR_TYPES = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  ORGANIZATION: 'organization',
};

export function isPersonalAuthor(authorType) {
  return authorType === AUTHOR_TYPES.PERSONAL || authorType === 'candidate';
}

export function isEmployerAuthor(authorType) {
  return (
    authorType === AUTHOR_TYPES.BUSINESS ||
    authorType === AUTHOR_TYPES.ORGANIZATION ||
    authorType === 'company'
  );
}

export function authorTypeFromRole(role) {
  if (role === 'personal' || role === 'candidate') return AUTHOR_TYPES.PERSONAL;
  if (role === 'organization') return AUTHOR_TYPES.ORGANIZATION;
  if (role === 'business' || role === 'company') return AUTHOR_TYPES.BUSINESS;
  return AUTHOR_TYPES.PERSONAL;
}

export function normalizeAuthorType(authorType) {
  if (authorType === 'candidate') return AUTHOR_TYPES.PERSONAL;
  if (authorType === 'company') return AUTHOR_TYPES.BUSINESS;
  if (
    authorType === AUTHOR_TYPES.PERSONAL ||
    authorType === AUTHOR_TYPES.BUSINESS ||
    authorType === AUTHOR_TYPES.ORGANIZATION
  ) {
    return authorType;
  }
  return authorType;
}
