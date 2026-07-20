export function formatUnreadBadge(count) {
  const value = Number(count ?? 0);
  if (value <= 0) return null;
  if (value > 99) return '99+';
  return String(value);
}

/** Header messages badge: red dot when count is unknown; counter (1, 2, 3…) when known. */
export function getMessagesBadgeState(count) {
  const value = Number(count ?? 0);
  if (value <= 0) return { type: 'none' };
  const label = formatUnreadBadge(value);
  if (label) return { type: 'count', label };
  return { type: 'dot' };
}
