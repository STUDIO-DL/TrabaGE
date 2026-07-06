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

const pluralize = (value, singular, plural) =>
  `Hace ${value} ${value === 1 ? singular : plural}`;

// Full-word Spanish "time ago" formatter for publication timestamps
// (posts, job offers, feed publications). Handles invalid/null dates gracefully.
export const formatTimeAgo = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const time = d.getTime();
  if (Number.isNaN(time)) return '';

  const diffMs = Math.max(0, Date.now() - time);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Hace unos segundos';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return pluralize(minutes, 'minuto', 'minutos');

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return pluralize(hours, 'hora', 'horas');

  const days = Math.floor(hours / 24);
  if (days < 7) return pluralize(days, 'día', 'días');

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return pluralize(weeks, 'semana', 'semanas');

  const months = Math.floor(days / 30);
  if (months < 12) return pluralize(months, 'mes', 'meses');

  const years = Math.max(1, Math.floor(days / 365));
  return pluralize(years, 'año', 'años');
};

export const formatDateRange = (start, end) => {
  if (!start && !end) return '';
  const startLabel = start
    ? formatDate(start, { month: 'short', year: 'numeric' })
    : '';
  const endLabel = end ? formatDate(end, { month: 'short', year: 'numeric' }) : 'Presente';
  if (!startLabel) return endLabel;
  return `${startLabel} – ${endLabel}`;
};
