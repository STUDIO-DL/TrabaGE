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

/** Local calendar day key (YYYY-MM-DD) for message day grouping. */
export function getMessageDayKey(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function capitalizeLabel(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * WhatsApp-style day separator label in the user's local timezone.
 * Hoy / Ayer / weekday (within last 7 local days) / full date.
 */
export function formatMessageDaySeparator(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const today = startOfLocalDay(new Date());
  const messageDay = startOfLocalDay(d);
  const diffDays = Math.round((today.getTime() - messageDay.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays >= 2 && diffDays < 7) {
    return capitalizeLabel(d.toLocaleDateString('es-ES', { weekday: 'long' }));
  }

  return capitalizeLabel(
    d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );
}

/** Clock time only (local), e.g. 14:32 */
export function formatMessageTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
