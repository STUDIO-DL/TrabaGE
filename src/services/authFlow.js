import { ROLES } from '../constants/roles';
import { authService, resolveSignupRoleFromUser } from './auth.service';
import { bootstrapProfile } from './profileBootstrap';
import { resolvePostAuthRedirect } from '../utils/resolvePostAuthRedirect';

/**
 * Central post-auth pipeline used by login, OAuth callback, and email verification:
 * resolve role → bootstrap profile → compute home/setup redirect.
 * Does not queue welcome email or navigate; callers own those steps.
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

  const role =
    accountTypeResult?.role ?? resolveSignupRoleFromUser(user) ?? null;

  if (role && role !== ROLES.ADMIN) {
    await bootstrapProfile({ user, role });
  }

  const redirectTo = await resolvePostAuthRedirect(user.id, role, { preferProfile });
  return { role, redirectTo, error: null };
}
