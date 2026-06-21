import { ROLE_HOME, ROLES } from '../constants/roles';
import { authService } from '../services/auth.service';
import { companyService } from '../services/company.service';
import { profileService } from '../services/profile.service';

// After authentication (login, signup confirmation, or Google OAuth) we always
// send users to their role-based home. Profile setup is optional and can be
// completed later from inside the app, so we no longer gate the redirect on
// whether a profile row exists / setup_complete is true.
export async function resolvePostAuthRedirect(userId) {
  const { data: roleData } = await authService.getUserRole(userId);
  const userRole = roleData?.role;

  if (userRole) {
    return ROLE_HOME[userRole] || '/account-type';
  }

  const [candidateProfile, companyProfile] = await Promise.all([
    profileService.getCandidateProfile(userId),
    companyService.getCompanyProfile(userId),
  ]);

  if (companyProfile?.data?.user_id) {
    return ROLE_HOME[ROLES.COMPANY];
  }

  if (candidateProfile?.data?.user_id) {
    return ROLE_HOME[ROLES.CANDIDATE];
  }

  return '/account-type';
}
