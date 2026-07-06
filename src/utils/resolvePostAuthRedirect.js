import { ROLE_HOME } from '../constants/roles';
import { authService } from '../services/auth.service';

// After authentication (login, signup confirmation, or Google OAuth) we always
// send users to their role-based home. Profile setup is optional and can be
// completed later from inside the app, so we no longer gate the redirect on
// whether a profile row exists / setup_complete is true.
export async function resolvePostAuthRedirect(userId) {
  // The AuthContext's hydrateUser function is responsible for complex role
  // resolution and backfilling. By the time this is called, the role should
  // be reliably available in the user_roles table.
  const { data: roleData } = await authService.getUserRole(userId);
  const userRole = roleData?.role;
  return ROLE_HOME[userRole] || '/register';
}
