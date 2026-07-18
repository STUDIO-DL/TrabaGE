import { ORGANIZATION_COMPANY_TYPES } from './feedContentTypes';

/**
 * Official account roles (user_roles.role).
 * Legacy DB values `candidate` / `company` are normalized at read time.
 */
export const ROLES = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  ORGANIZATION: 'organization',
  ADMIN: 'admin',
};

export const EMPLOYER_ROLES = [ROLES.BUSINESS, ROLES.ORGANIZATION];

export const ROLE_LABELS = {
  [ROLES.PERSONAL]: 'Cuenta Personal',
  [ROLES.BUSINESS]: 'Cuenta Business',
  [ROLES.ORGANIZATION]: 'Cuenta de Organización',
  [ROLES.ADMIN]: 'Administrador',
};

export const ROLE_HOME = {
  [ROLES.PERSONAL]: '/personal/feed',
  [ROLES.BUSINESS]: '/business/dashboard',
  [ROLES.ORGANIZATION]: '/organization/dashboard',
  [ROLES.ADMIN]: '/admin',
};

/** Role-scoped profile pages — first landing after account creation. */
export const ROLE_PROFILE = {
  [ROLES.PERSONAL]: '/personal/profile',
  [ROLES.BUSINESS]: '/business/profile',
  [ROLES.ORGANIZATION]: '/organization/profile',
};

export const ROLE_SETUP = {
  [ROLES.PERSONAL]: '/setup/personal',
  [ROLES.BUSINESS]: '/setup/business',
  [ROLES.ORGANIZATION]: '/setup/organization',
};

/** Path prefix for role-scoped app routes (feed, settings, etc.). */
export function getRolePathPrefix(role) {
  if (role === ROLES.PERSONAL) return '/personal';
  if (role === ROLES.BUSINESS) return '/business';
  if (role === ROLES.ORGANIZATION) return '/organization';
  if (role === ROLES.ADMIN) return '/admin';
  return '';
}

/** Build a role-scoped path, e.g. rolePath(ROLES.PERSONAL, '/settings') → '/personal/settings'. */
export function rolePath(role, suffix = '') {
  const prefix = getRolePathPrefix(role);
  if (!prefix) return suffix || '/';
  if (!suffix) return prefix;
  return `${prefix}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
}

export function isPersonalRole(role) {
  return role === ROLES.PERSONAL || role === 'candidate';
}

export function isEmployerRole(role) {
  return (
    role === ROLES.BUSINESS ||
    role === ROLES.ORGANIZATION ||
    role === 'company'
  );
}

export function isOrganizationRole(role) {
  return role === ROLES.ORGANIZATION;
}

export function isBusinessRole(role) {
  return role === ROLES.BUSINESS;
}

export function isOrganizationCompanyType(companyType) {
  return ORGANIZATION_COMPANY_TYPES.includes(companyType);
}

/**
 * Normalize legacy or new role strings to the official model.
 * For legacy `company`, pass companyType to distinguish business vs organization.
 */
export function normalizeRole(role, { companyType } = {}) {
  if (!role) return null;
  const value = String(role).toLowerCase().trim();

  if (value === 'admin') return ROLES.ADMIN;
  if (value === 'personal' || value === 'candidate') return ROLES.PERSONAL;
  if (value === 'organization' || value === 'institution') return ROLES.ORGANIZATION;
  if (value === 'business') return ROLES.BUSINESS;
  if (value === 'company') {
    return isOrganizationCompanyType(companyType) ? ROLES.ORGANIZATION : ROLES.BUSINESS;
  }
  return null;
}

/** Roles accepted by set_initial_user_role / signup (excludes admin). */
export const ASSIGNABLE_ROLES = [ROLES.PERSONAL, ROLES.BUSINESS, ROLES.ORGANIZATION];
