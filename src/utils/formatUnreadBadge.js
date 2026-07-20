export function formatUnreadBadge(count) {
  const value = Number(count ?? 0);
  if (value <= 0) return null;
  if (value > 99) return '99+';
  return String(value);
}
