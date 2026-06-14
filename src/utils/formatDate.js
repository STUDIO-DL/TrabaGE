export const formatDate = (date, options = {}) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return formatDate(d);
};

export const formatDateRange = (start, end) => {
  if (!start && !end) return '';
  const startLabel = start
    ? formatDate(start, { month: 'short', year: 'numeric' })
    : '';
  const endLabel = end ? formatDate(end, { month: 'short', year: 'numeric' }) : 'Actualidad';
  if (!startLabel) return endLabel;
  return `${startLabel} – ${endLabel}`;
};
