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

import { DEEP_LINK_PATHS } from './deepLinks';
import { ROLES, isEmployerRole, normalizeRole, rolePath } from '../constants/roles';

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
  if (metadata.target_type === 'post' || /\/post\//.test(link)) {
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
 * Prefers the stored `metadata.link`; otherwise derives a sensible route from
 * the type + metadata so navigation stays correct even for legacy rows.
 * @param {object} notification
 * @param {string} [role] - 'candidate' | 'company' (affects scoped fallbacks)
 * @returns {string | null}
 */
export function getNotificationLink(notification, role = 'candidate') {
  const metadata = notification?.metadata ?? {};
  if (metadata.link) return metadata.link;

  const category = getNotificationCategory(notification);

  if (category === NOTIFICATION_CATEGORY.JOBS) {
    if (metadata.job_id) {
      // Canonical shareable job path (maps to JobDetail for any role). This
      // avoids the previously broken `/business/jobs/:id` route, which never
      // existed (only `/business/jobs/:jobId/edit` does).
      return DEEP_LINK_PATHS.job(metadata.job_id);
    }
    return isEmployerRole(role)
      ? rolePath(normalizeRole(role) ?? ROLES.BUSINESS, '/applicants')
      : rolePath(ROLES.PERSONAL, '/applications');
  }

  if (category === NOTIFICATION_CATEGORY.POSTS) {
    const postId = metadata.post_id ?? (metadata.target_type === 'post' ? metadata.target_id : null);
    if (postId) return DEEP_LINK_PATHS.post(postId);
    const companyId = metadata.target_type === 'company' ? metadata.target_id : metadata.actor_id;
    if (companyId) return DEEP_LINK_PATHS.company(companyId);
  }

  return null;
}
