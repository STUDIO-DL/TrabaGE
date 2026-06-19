import { ROLE_HOME, ROLE_SETUP, ROLES } from '../constants/roles';
import { authService } from '../services/auth.service';
import { companyService } from '../services/company.service';
import { profileService } from '../services/profile.service';

export async function resolvePostAuthRedirect(userId) {
  // Fetch the role and both profiles in parallel. We don't know the role up
  // front, so resolving everything concurrently turns two serial round-trips
  // (role -> profile) into a single round-trip of latency. The unused profile
  // result is simply ignored.
  const [roleResult, candidateResult, companyResult] = await Promise.all([
    authService.getUserRole(userId),
    profileService.getCandidateProfile(userId),
    companyService.getCompanyProfile(userId),
  ]);

  const userRole = roleResult?.data?.role ?? ROLES.CANDIDATE;

  if (userRole === ROLES.CANDIDATE) {
    return candidateResult?.data?.setup_complete
      ? ROLE_HOME[ROLES.CANDIDATE]
      : ROLE_SETUP[ROLES.CANDIDATE];
  }

  if (userRole === ROLES.COMPANY) {
    return companyResult?.data?.setup_complete
      ? ROLE_HOME[ROLES.COMPANY]
      : ROLE_SETUP[ROLES.COMPANY];
  }

  return ROLE_HOME[userRole] || '/account-type';
}
