import { ROLES, isEmployerRole, isPersonalRole } from '../constants/roles';
import { ACCOUNT_KINDS } from '../constants/accountKinds';
import { profileService } from './profile.service';
import { companyService } from './company.service';
import {
  consumePendingOrgDetails,
  consumePendingOrgKind,
  peekPendingOrgDetails,
  peekPendingOrgKind,
} from './auth.service';
import { extractGoogleProfile } from '../utils/googleProfile';
import { reportError } from '../utils/logger';
import { isOrganizationKind } from '../utils/orgLabels';

const ORGANIZATION_DEFAULT_COMPANY_TYPE = 'Institucion publica';

function fallbackNameFromEmail(email) {
  const handle = String(email ?? '')
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .trim();
  if (!handle) return 'Usuario';
  return handle.replace(/\b\w/g, (char) => char.toUpperCase());
}

function readSignupMetadata(user) {
  const meta = user?.user_metadata ?? {};
  return {
    full_name: String(meta.full_name || meta.name || '').trim() || null,
    city: String(meta.city || '').trim() || null,
  };
}

// Ensures the candidate profile row exists and prefills known data. Existing
// rows are only *backfilled* (never overwritten) so we don't clobber user edits.
async function ensureCandidateProfile(userId, user, metadata) {
  const google = extractGoogleProfile(user);
  const { data: existing } = await profileService.getCandidateProfile(userId);

  if (existing?.user_id) {
    const patch = {};
    if (!existing.full_name && (google.full_name || metadata.full_name)) {
      patch.full_name = google.full_name || metadata.full_name;
    }
    if (!existing.avatar_path && google.avatar_url) patch.avatar_path = google.avatar_url;
    if (!existing.city && metadata.city) patch.city = metadata.city;
    if (Object.keys(patch).length > 0) {
      await profileService.updateCandidateProfile(userId, patch);
    }
    return;
  }

  const fullName =
    google.full_name ||
    metadata.full_name ||
    fallbackNameFromEmail(google.email || user?.email);

  await profileService.upsertCandidateProfile({
    user_id: userId,
    full_name: fullName,
    city: metadata.city || null,
    avatar_path: google.avatar_url || null,
  });
}

// Ensures the company/institution profile row exists and prefills what we know.
// company_name is NOT NULL in the schema, so brand-new Google orgs get an empty
// placeholder and are guided to the setup assistant to complete it.
async function ensureCompanyProfile(userId, user, metadata, orgKind, orgDetails) {
  const { data: existing } = await companyService.getCompanyProfile(userId);

  if (existing?.user_id) {
    const patch = {};
    if (!existing.company_name && orgDetails.company_name) {
      patch.company_name = orgDetails.company_name;
    }
    if (!existing.sector && orgDetails.sector) patch.sector = orgDetails.sector;
    if (!existing.company_type && orgDetails.company_type) {
      patch.company_type = orgDetails.company_type;
    }
    if (!existing.city && metadata.city) patch.city = metadata.city;
    if (Object.keys(patch).length > 0) {
      await companyService.upsertCompanyProfile({ user_id: userId, ...patch });
    }
    return;
  }

  const isOrganization = isOrganizationKind(orgKind) || orgKind === ACCOUNT_KINDS.ORGANIZATION;
  const companyType =
    orgDetails.company_type || (isOrganization ? ORGANIZATION_DEFAULT_COMPANY_TYPE : null);

  await companyService.upsertCompanyProfile({
    user_id: userId,
    company_name: orgDetails.company_name || '',
    sector: orgDetails.sector || null,
    company_type: companyType,
    city: metadata.city || null,
  });
}

/**
 * Shared profile-creation path used by BOTH manual (email-verified) and Google
 * sign-ups. Given the authenticated user + resolved role, it ensures the correct
 * profile row exists and prefills known fields (Google name/photo, city, and the
 * org details entered at sign-up). Safe to call repeatedly (idempotent) and for
 * existing users (it only backfills empty fields).
 *
 * The role MUST already be set (user_roles) before calling this, because the
 * profile INSERT RLS policies require get_my_role() to match.
 */
export async function bootstrapProfile({ user, role }) {
  const userId = user?.id;
  if (!userId || !role || role === ROLES.ADMIN) {
    return { error: null };
  }

  const metadata = readSignupMetadata(user);

  try {
    if (isPersonalRole(role)) {
      await ensureCandidateProfile(userId, user, metadata);
    } else if (isEmployerRole(role)) {
      // Peek first so a failed upsert leaves pending values for CompanySetup.
      const orgKind = peekPendingOrgKind();
      const orgDetails = peekPendingOrgDetails();
      await ensureCompanyProfile(userId, user, metadata, orgKind, orgDetails);
      consumePendingOrgKind();
      consumePendingOrgDetails();
    }
    return { error: null };
  } catch (error) {
    // Never block the auth flow on profile bootstrap; the setup assistant can
    // still create/complete the row. Surface for observability only.
    reportError(error, { area: 'profile_bootstrap', role });
    return { error };
  }
}
