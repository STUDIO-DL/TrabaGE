import { getNotificationLink } from './notificationCategories.js';

export function resolvePushNavigationTarget(notification, origin = '') {
  if (!notification || typeof notification !== 'object') return null;

  const metadata = notification.metadata ?? notification.additionalData ?? {};
  const launchUrl = notification.launchUrl ?? notification.launchURL ?? notification.url ?? null;
  const resolvedPath = metadata ? getNotificationLink({ type: metadata.type ?? notification.type, metadata }) : null;

  const candidate = resolvedPath ?? metadata?.link ?? launchUrl ?? null;
  if (!candidate || typeof candidate !== 'string') return null;

  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return baseOrigin ? `${baseOrigin}${path}` : path;
}
