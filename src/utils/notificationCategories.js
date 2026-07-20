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
export function getNotificationLink(notification, role = ROLES.PERSONAL) {
  const metadata = notification?.metadata ?? {};
  const resolvedRole = normalizeRole(role) ?? (isEmployerRole(role) ? ROLES.BUSINESS : ROLES.PERSONAL);
  const category = getNotificationCategory(notification);

  // Post notifications must open the publication itself — post_id wins over a
  // legacy metadata.link that pointed at the company profile.
  if (category === NOTIFICATION_CATEGORY.POSTS) {
    const postId = metadata.post_id ?? (metadata.target_type === 'post' ? metadata.target_id : null);
    if (postId) {
      const link = DEEP_LINK_PATHS.post(postId);
      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'49d13a'},body:JSON.stringify({sessionId:'49d13a',runId:'pre-fix',hypothesisId:'A',location:'notificationCategories.js:getNotificationLink',message:'resolved via post_id',data:{type:notification?.type,category,postId,link,metadataKeys:Object.keys(metadata),metadataLink:metadata.link??null,targetType:metadata.target_type??null,targetId:metadata.target_id??null,actorId:metadata.actor_id??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return link;
    }
  }

  if (metadata.link) {
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'49d13a'},body:JSON.stringify({sessionId:'49d13a',runId:'pre-fix',hypothesisId:'B',location:'notificationCategories.js:getNotificationLink',message:'resolved via metadata.link',data:{type:notification?.type,category,link:metadata.link,hasPostId:Boolean(metadata.post_id),targetType:metadata.target_type??null,actorId:metadata.actor_id??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return metadata.link;
  }

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

  if (category === NOTIFICATION_CATEGORY.POSTS) {
    const companyId =
      metadata.actor_id ??
      (metadata.target_type === 'company' ||
      metadata.target_type === 'business' ||
      metadata.target_type === 'organization'
        ? metadata.target_id
        : null);
    if (companyId) {
      const link = DEEP_LINK_PATHS.company(companyId);
      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'49d13a'},body:JSON.stringify({sessionId:'49d13a',runId:'pre-fix',hypothesisId:'A',location:'notificationCategories.js:getNotificationLink',message:'POSTS fallback to company (no post_id)',data:{type:notification?.type,category,companyId,link,metadataKeys:Object.keys(metadata),targetType:metadata.target_type??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return link;
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'49d13a'},body:JSON.stringify({sessionId:'49d13a',runId:'pre-fix',hypothesisId:'E',location:'notificationCategories.js:getNotificationLink',message:'resolved null',data:{type:notification?.type,category,metadataKeys:Object.keys(metadata)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return null;
}
