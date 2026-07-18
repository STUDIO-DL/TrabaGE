import { supabase } from '../config/supabase';
import { ROLES } from '../constants/roles';
import { consumePendingSignupDetails, peekPendingSignupDetails } from './auth.service';
import { nameFromEmail } from '../utils/displayIdentity';
import { extractGoogleProfile } from '../utils/googleProfile';
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

/** Derive profile fields from OAuth/email auth metadata when the registration form was skipped. */
function buildIdentityOverrides(user, role, pendingDetails) {
  const fromForm = buildProvisionOverrides(role, pendingDetails);
  if (Object.keys(fromForm).length > 0) return fromForm;

  const meta = user?.user_metadata ?? {};
  const google = extractGoogleProfile(user);
  const overrides = {};

  const fullName = String(
    meta.full_name || meta.name || google.full_name || nameFromEmail(user?.email) || '',
  ).trim();
  const avatarUrl = String(meta.avatar_url || meta.picture || google.avatar_url || '').trim();

  if (fullName) overrides.full_name = fullName;
  if (avatarUrl) overrides.avatar_path = avatarUrl;

  if (role === ROLES.BUSINESS || role === ROLES.ORGANIZATION) {
    const companyName = String(meta.company_name || '').trim() || fullName;
    if (companyName) overrides.company_name = companyName;
    if (role === ROLES.ORGANIZATION && !String(meta.company_type || '').trim()) {
      overrides.company_type = 'Institucion publica';
    }
  }

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
  const overrides = buildIdentityOverrides(user, role, pendingDetails);

  try {
    const { data, error } = await supabase.rpc('provision_user_profile', {
      p_user_id: userId,
      p_overrides: Object.keys(overrides).length > 0 ? overrides : null,
    });

    if (error) {
      reportError(error, { area: 'profile_bootstrap', role, userId });
      return { error, data: null };
    }

    consumePendingSignupDetails();
    return { error: null, data };
  } catch (error) {
    reportError(error, { area: 'profile_bootstrap', role, userId });
    return { error, data: null };
  }
}
