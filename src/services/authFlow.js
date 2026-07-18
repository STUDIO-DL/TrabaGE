import { ROLES } from '../constants/roles';
import { authService } from './auth.service';
import { bootstrapProfile } from './profileBootstrap';
import { resolvePostAuthRedirect } from '../utils/resolvePostAuthRedirect';

/**
 * Central post-auth pipeline used by OAuth callback and email verification:
 * resolve role → bootstrap profile → compute home/setup redirect.
 * Does not navigate; callers own navigation and auth-context refresh.
 */
export async function completePostAuthFlow(user, { preferProfile = true } = {}) {
  if (!user?.id) {
    return { error: { message: 'No se pudo identificar el usuario autenticado' } };
  }

  const { data: accountTypeResult, error: accountTypeError } =
    await authService.applyPendingAccountType(user);

  if (accountTypeError) {
    return { error: accountTypeError };
  }

  if (accountTypeResult?.needsAccountTypeSelection) {
    return { needsAccountTypeSelection: true, role: null, redirectTo: null };
  }

  const role = accountTypeResult?.role ?? null;

  if (role && role !== ROLES.ADMIN) {
    await bootstrapProfile({ user, role });
  }

  const redirectTo = await resolvePostAuthRedirect(user.id, role, { preferProfile: true });
  return { role, redirectTo, error: null };
}
