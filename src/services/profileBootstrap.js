import { supabase } from '../config/supabase';
import { ROLES } from '../constants/roles';
import { consumePendingSignupDetails, peekPendingSignupDetails } from './auth.service';
import { reportError } from '../utils/logger';

function buildProvisionOverrides(role, pendingDetails) {
  if (!pendingDetails || typeof pendingDetails !== 'object') return {};

  const overrides = {};
  if (pendingDetails.full_name?.trim()) overrides.full_name = pendingDetails.full_name.trim();
  if (pendingDetails.company_name?.trim()) overrides.company_name = pendingDetails.company_name.trim();
  if (pendingDetails.sector?.trim()) overrides.sector = pendingDetails.sector.trim();
  if (pendingDetails.company_type?.trim()) overrides.company_type = pendingDetails.company_type.trim();
  if (pendingDetails.city?.trim()) overrides.city = pendingDetails.city.trim();
  if (pendingDetails.avatar_path?.trim()) overrides.avatar_path = pendingDetails.avatar_path.trim();

  return overrides;
}

/**
 * Unified profile bootstrap — delegates to server RPC `provision_user_profile`.
 * Idempotent: safe on every session hydrate and after auth confirmation/OAuth.
 * Pending signup fields (Google org/personal data from registration form) are
 * passed once as overrides, then consumed.
 */
export async function bootstrapProfile({ user, role }) {
  const userId = user?.id;
  if (!userId || !role || role === ROLES.ADMIN) {
    return { error: null, data: null };
  }

  const pendingDetails = peekPendingSignupDetails();
  const overrides = buildProvisionOverrides(role, pendingDetails);

  try {
    const { data, error } = await supabase.rpc('provision_user_profile', {
      p_user_id: userId,
      p_overrides: Object.keys(overrides).length > 0 ? overrides : null,
    });

    if (error) {
      reportError(error, { area: 'profile_bootstrap', role, userId });
      return { error, data: null };
    }

    if (data?.created || data?.backfilled) {
      consumePendingSignupDetails();
    }

    return { error: null, data };
  } catch (error) {
    reportError(error, { area: 'profile_bootstrap', role, userId });
    return { error, data: null };
  }
}
