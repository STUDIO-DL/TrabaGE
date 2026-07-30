import { getNotificationLink } from './notificationCategories.js';
import { sanitizeAppNavigationTarget } from './safeNavigation.js';

export { sanitizeAppNavigationTarget } from './safeNavigation.js';

export function resolvePushNavigationTarget(notification, origin = '') {
  if (!notification || typeof notification !== 'object') return null;

  const metadata = notification.metadata ?? notification.additionalData ?? {};
  const launchUrl = notification.launchUrl ?? notification.launchURL ?? notification.url ?? null;
  const resolvedPath = metadata
    ? getNotificationLink({ type: metadata.type ?? notification.type, metadata })
    : null;

  const candidate = resolvedPath ?? metadata?.link ?? launchUrl ?? null;
  return sanitizeAppNavigationTarget(candidate, origin);
}
