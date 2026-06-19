import { ROLE_HOME, ROLES } from '../constants/roles';
import { authService } from '../services/auth.service';

// After authentication (login, signup confirmation, or Google OAuth) we always
// send users to their role-based home. Profile setup is optional and can be
// completed later from inside the app, so we no longer gate the redirect on
// whether a profile row exists / setup_complete is true.
export async function resolvePostAuthRedirect(userId) {
  const { data } = await authService.getUserRole(userId);
  const userRole = data?.role ?? ROLES.CANDIDATE;

  return ROLE_HOME[userRole] || '/account-type';
}
