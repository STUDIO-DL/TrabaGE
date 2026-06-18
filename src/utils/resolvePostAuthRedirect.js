import { ROLE_HOME, ROLE_SETUP, ROLES } from '../constants/roles';
import { authService } from '../services/auth.service';
import { companyService } from '../services/company.service';
import { profileService } from '../services/profile.service';

export async function resolvePostAuthRedirect(userId) {
  const { data: roleData } = await authService.getUserRole(userId);
  const userRole = roleData?.role ?? ROLES.CANDIDATE;

  let redirectTo = ROLE_HOME[userRole] || '/account-type';

  if (userRole === ROLES.CANDIDATE) {
    const { data: profile } = await profileService.getCandidateProfile(userId);
    if (!profile?.setup_complete) redirectTo = ROLE_SETUP[ROLES.CANDIDATE];
  } else if (userRole === ROLES.COMPANY) {
    const { data: profile } = await companyService.getCompanyProfile(userId);
    if (!profile?.setup_complete) redirectTo = ROLE_SETUP[ROLES.COMPANY];
  }

  return redirectTo;
}
