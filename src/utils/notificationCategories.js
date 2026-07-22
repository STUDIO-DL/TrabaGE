// Single source of truth for classifying notifications into the segmented
// filter chips shown on the Notifications screen (candidate + company).
//
// Only three categories exist today because the product does not yet produce
// comments / reposts / mentions:
//   - "Todas"   → everything, chronologically mixed
//   - "Empleos" → job-related activity (recommendations, new offers from
//                 followed companies, applications, application status updates)
//   - "Posts"   → posts / updates published by followed companies & institutions
//
// Any type that fits neither bucket (e.g. verification/account notifications)
// still appears under "Todas" but is excluded from the specific chips.

import { DEEP_LINK_PATHS } from './deepLinks.js';
import { ROLES, isEmployerRole, normalizeRole, rolePath } from '../constants/roles.js';

export const NOTIFICATION_CATEGORY = {
  ALL: 'all',
  JOBS: 'jobs',
  POSTS: 'posts',
};

// Chip definitions consumed by the UI (order matters, left → right).
export const NOTIFICATION_FILTERS = [
  { id: NOTIFICATION_CATEGORY.ALL, label: 'Todas' },
  { id: NOTIFICATION_CATEGORY.JOBS, label: 'Empleos' },
  { id: NOTIFICATION_CATEGORY.POSTS, label: 'Posts' },
];

// Explicit type → category mapping. `application_${status}` types are matched
// by prefix below, so we only need to list the fixed ones here.
const JOB_TYPES = new Set([
  'job_recommendation',
  'new_job',
  'new_application',
]);

const POST_TYPES = new Set([
  'new_post',
  'company_update',
  'post_interaction',
]);

const COMPANY_PROFILE_LINK_RE = /\/companies\/[^/?#]+/i;
const POST_LINK_RE = /\/post\/([^/?#]+)/i;

/**
 * Extract a publication id from notification metadata (explicit fields or deep link).
 * @param {object} metadata
 * @returns {string | null}
 */
export function extractPostIdFromMetadata(metadata = {}) {
  const explicit =
    metadata.post_id ??
    metadata.postId ??
    (metadata.target_type === 'post' ? metadata.target_id : null);
  if (explicit) return String(explicit);

  const link = typeof metadata.link === 'string' ? metadata.link : '';
  const match = link.match(POST_LINK_RE);
  return match?.[1] ? String(match[1]) : null;
}

function isCompanyProfileLink(link) {
  return typeof link === 'string' && COMPANY_PROFILE_LINK_RE.test(link);
}

/**
 * Resolve the primary category of a notification, preferring metadata hints
 * over the raw type when the type is ambiguous.
 * @returns {'jobs' | 'posts' | 'other'}
 */
export function getNotificationCategory(notification) {
  const type = notification?.type ?? '';
  const metadata = notification?.metadata ?? {};

  if (JOB_TYPES.has(type) || type.startsWith('application_')) {
    return NOTIFICATION_CATEGORY.JOBS;
  }
  if (POST_TYPES.has(type) || type.startsWith('post_')) {
    return NOTIFICATION_CATEGORY.POSTS;
  }

  // Ambiguous type → lean on metadata.
  const link = metadata.link ?? '';
  if (metadata.job_id || metadata.target_type === 'job' || /\/jobs?\//.test(link)) {
    return NOTIFICATION_CATEGORY.JOBS;
  }
  if (
    metadata.post_id ||
    metadata.postId ||
    metadata.target_type === 'post' ||
    /\/post\//.test(link)
  ) {
    return NOTIFICATION_CATEGORY.POSTS;
  }

  return 'other';
}

/**
 * Does a notification belong under the given chip? "Todas" matches everything.
 */
export function matchesCategory(notification, category) {
  if (category === NOTIFICATION_CATEGORY.ALL) return true;
  return getNotificationCategory(notification) === category;
}

/**
 * Resolve the in-app route to open when a notification is clicked.
 * Post notifications always open the publication when a post id can be resolved
 * (including from `/post/:id` links). Legacy company-profile links are ignored
 * for the Posts category so taps never land on the company profile by mistake.
 * @param {object} notification
 * @param {string} [role] - 'candidate' | 'company' (affects scoped fallbacks)
 * @returns {string | null}
 */
export function getNotificationLink(notification, role = ROLES.PERSONAL) {
  const metadata = notification?.metadata ?? {};
  const resolvedRole = normalizeRole(role) ?? (isEmployerRole(role) ? ROLES.BUSINESS : ROLES.PERSONAL);
  const category = getNotificationCategory(notification);

  // Post notifications must open the publication itself — never the company profile.
  if (category === NOTIFICATION_CATEGORY.POSTS) {
    const postId = extractPostIdFromMetadata(metadata);
    if (postId) return DEEP_LINK_PATHS.post(postId);

    // Prefer a non-company link if present; never fall back to /companies/:id.
    if (metadata.link && !isCompanyProfileLink(metadata.link)) {
      return metadata.link;
    }
    return null;
  }

  if (metadata.link) return metadata.link;

  if (notification?.type === 'new_message' && metadata.conversation_id) {
    return rolePath(resolvedRole, `/messages/${metadata.conversation_id}`);
  }

  if (category === NOTIFICATION_CATEGORY.JOBS) {
    if (notification?.type === 'new_application' && metadata.candidate_id) {
      return DEEP_LINK_PATHS.profile(metadata.candidate_id);
    }
    if (metadata.job_id) {
      // Canonical shareable job path (maps to JobDetail for any role). This
      // avoids the previously broken `/business/jobs/:id` route, which never
      // existed (only `/business/jobs/:jobId/edit` does).
      return DEEP_LINK_PATHS.job(metadata.job_id);
    }
    return isEmployerRole(role)
      ? rolePath(resolvedRole, '/applicants')
      : rolePath(ROLES.PERSONAL, '/applications');
  }

  return null;
}
