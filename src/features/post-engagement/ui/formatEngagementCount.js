/** Compact counter for post actions (1.2k style). */
export function formatEngagementCount(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (n < 1000000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}
