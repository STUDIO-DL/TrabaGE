import {
  ROLE_HOME,
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

// After authentication (login, signup confirmation, or Google OAuth) we send
// users to their role-based home when their profile has the minimum required
// data, or to the setup assistant to complete ONLY the missing required fields.
// This keeps manual and Google flows identical: land on the dashboard or the
// complete-profile assistant, never on an extra account-type screen.
export async function resolvePostAuthRedirect(userId, knownRole = null) {
  let userRole = knownRole;
  if (!userRole) {
    const { data: roleData } = await authService.getUserRole(userId);
    userRole = roleData?.role;
  }

  if (!userRole) return '/login';

  if (userRole === ROLES.ADMIN) return ROLE_HOME[ROLES.ADMIN];

  if (isPersonalRole(userRole)) {
    const role = ROLES.PERSONAL;
    const { data } = await profileService.getCandidateProfile(userId);
    return isProfileSetupComplete(role, data) ? ROLE_HOME[role] : ROLE_SETUP[role];
  }

  if (isEmployerRole(userRole)) {
    const { data } = await companyService.getCompanyProfile(userId);
    const role = normalizeRole(userRole, { companyType: data?.company_type }) ?? ROLES.BUSINESS;
    return isProfileSetupComplete(role, data) ? ROLE_HOME[role] : ROLE_SETUP[role];
  }

  const normalized = normalizeRole(userRole);
  return ROLE_HOME[normalized || userRole] || '/login';
}
