import {
  ROLE_HOME,
  ROLE_PROFILE,
  ROLE_SETUP,
  ROLES,
  isEmployerRole,
  isPersonalRole,
  normalizeRole,
} from '../constants/roles';
import { authService } from '../services/auth.service';
import { profileService } from '../services/profile.service';
import { companyService } from '../services/company.service';
import { isProfileSetupComplete } from './profileRequirements';

/**
 * After authentication, compute where to send the user.
 *
 * @param {string} userId
 * @param {string|null} knownRole
 * @param {{ preferProfile?: boolean }} options
 *   preferProfile — true for signup/OAuth/first session (land on profile);
 *                   false for returning login (land on feed/dashboard).
 */
export async function resolvePostAuthRedirect(userId, knownRole = null, { preferProfile = false } = {}) {
  let userRole = knownRole;
  if (!userRole) {
    const { data: roleData } = await authService.getUserRole(userId);
    userRole = roleData?.role;
  }

  if (!userRole) return '/register';

  if (userRole === ROLES.ADMIN) return ROLE_HOME[ROLES.ADMIN];

  if (isPersonalRole(userRole)) {
    const role = ROLES.PERSONAL;
    const { data } = await profileService.getCandidateProfile(userId);
    if (!isProfileSetupComplete(role, data)) return ROLE_SETUP[role];
    return preferProfile ? ROLE_PROFILE[role] : ROLE_HOME[role];
  }

  if (isEmployerRole(userRole)) {
    const { data } = await companyService.getCompanyProfile(userId);
    const role = normalizeRole(userRole, { companyType: data?.company_type }) ?? ROLES.BUSINESS;
    if (!isProfileSetupComplete(role, data)) return ROLE_SETUP[role];
    return preferProfile ? ROLE_PROFILE[role] : ROLE_HOME[role];
  }

  const normalized = normalizeRole(userRole);
  return ROLE_HOME[normalized || userRole] || '/login';
}
