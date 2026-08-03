/** Fixed platform TTL for chat messages (cannot be configured per user). */
export const MESSAGE_TTL_DAYS = 14;

export const MESSAGE_TTL_MS = MESSAGE_TTL_DAYS * 24 * 60 * 60 * 1000;

export const MESSAGE_EPHEMERAL_BANNER =
  'Los mensajes desaparecen automáticamente 14 días después de enviarse.';

/** True when the message row is still visible (not soft-deleted, not past expires_at). */
export function isMessageActive(message, now = Date.now()) {
  if (!message) return false;
  if (message.deleted_at) return false;
  if (!message.expires_at) return true;
  const expires = new Date(message.expires_at).getTime();
  if (Number.isNaN(expires)) return true;
  return expires > now;
}

export function computeMessageExpiresAt(createdAt = new Date()) {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(base.getTime())) return new Date(Date.now() + MESSAGE_TTL_MS).toISOString();
  return new Date(base.getTime() + MESSAGE_TTL_MS).toISOString();
}
