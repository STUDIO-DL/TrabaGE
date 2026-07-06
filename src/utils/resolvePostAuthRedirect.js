import { ROLE_HOME, ROLE_SETUP, ROLES } from '../constants/roles';
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

  if (!userRole) return '/register';
  if (userRole === ROLES.ADMIN) return ROLE_HOME[ROLES.ADMIN];

  if (userRole === ROLES.CANDIDATE) {
    const { data } = await profileService.getCandidateProfile(userId);
    return isProfileSetupComplete(ROLES.CANDIDATE, data)
      ? ROLE_HOME[ROLES.CANDIDATE]
      : ROLE_SETUP[ROLES.CANDIDATE];
  }

  if (userRole === ROLES.COMPANY) {
    const { data } = await companyService.getCompanyProfile(userId);
    return isProfileSetupComplete(ROLES.COMPANY, data)
      ? ROLE_HOME[ROLES.COMPANY]
      : ROLE_SETUP[ROLES.COMPANY];
  }

  return ROLE_HOME[userRole] || '/register';
}
