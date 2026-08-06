function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * Build an OS-push payload only from a notification row already authorized and
 * persisted by the database. Request payloads are never treated as content.
 */
export function canonicalPushFromNotification(notification, notificationType) {
  const title = cleanText(notification?.title);
  const type = cleanText(notificationType);
  if (!title || !type) return null;

  const body = cleanText(notification?.body) || title;
  return {
    title,
    body,
    data: {
      ...asRecord(notification?.metadata),
      type,
    },
  };
}

/**
 * Bind a non-self push request to the exact title/body of a recent in-app
 * notification. The caller may locate a row, but cannot replace its content.
 */
export function matchesRequestedPush(notification, notificationType, requestedTitle, requestedBody) {
  const canonical = canonicalPushFromNotification(notification, notificationType);
  if (!canonical) return false;

  return (
    canonical.title === cleanText(requestedTitle) &&
    canonical.body === cleanText(requestedBody)
  );
}

/**
 * Some database-triggered notifications are dispatched by the actor without
 * exposing the recipient's notification row. They may use the persisted row
 * without a text match only when correlation data binds the actor to the type.
 */
export function canUseCanonicalNotificationWithoutTextMatch(notificationType, data, callerId) {
  const type = cleanText(notificationType);
  const source = asRecord(data);
  const caller = cleanText(callerId);

  return (
    type === 'new_follower' &&
    caller.length > 0 &&
    cleanText(source.follower_id) === caller
  );
}
