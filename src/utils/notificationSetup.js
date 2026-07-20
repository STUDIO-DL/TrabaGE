import { hasJobPreferences } from '../constants/jobPreferences';

/**
 * Returns true when the user has completed the minimum notification setup:
 * push enabled (master toggle), job alerts enabled, and at least one job-alert preference signal.
 */
export function areNotificationsConfigured({ pushPreferences, profile } = {}) {
  if (!pushPreferences?.push_enabled) return false;
  if (profile?.notifications_enabled === false) return false;

  return (
    pushPreferences.employment_new_jobs !== false ||
    hasJobPreferences(profile?.job_preferences)
  );
}

export function getNotificationSettingsPath(rolePrefix = '/personal') {
  return `${rolePrefix}/settings/notifications`;
}

export function getNotificationsInboxPath(rolePrefix = '/personal') {
  return `${rolePrefix}/notifications`;
}
