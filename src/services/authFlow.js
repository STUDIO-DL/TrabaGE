import { ROLES } from '../constants/roles';
import { authService, resolveSignupRoleFromUser } from './auth.service';
import { bootstrapProfile } from './profileBootstrap';
import { resolvePostAuthRedirect } from '../utils/resolvePostAuthRedirect';
import { adminService } from './admin.service';
import { supabase } from '../config/supabase';

async function ensureAccountIsActive(role) {
  if (role === ROLES.ADMIN) return null;

  const { data, error } = await adminService.isMyAccountActive();
  if (error) return error;
  if (data === false) {
    await supabase.auth.signOut();
    return { message: 'Tu cuenta está desactivada. Contacta con soporte si crees que es un error.' };
  }
  return null;
}

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

  const inactiveError = await ensureAccountIsActive(role);
  if (inactiveError) {
    return { error: inactiveError };
  }

  if (role && role !== ROLES.ADMIN) {
    await bootstrapProfile({ user, role });
  }

  const redirectTo = await resolvePostAuthRedirect(user.id, role, { preferProfile });
  return { role, redirectTo, error: null };
}
