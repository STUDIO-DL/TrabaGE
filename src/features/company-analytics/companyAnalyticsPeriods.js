/** Period presets for company (employer) analytics. */

export const COMPANY_ANALYTICS_PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: '90d', label: 'Últimos 90 días' },
  { id: 'all', label: 'Todo el tiempo' },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfNextDay(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function resolveCompanyAnalyticsPeriod(periodId) {
  const now = new Date();
  const end = startOfNextDay(now);
  let start;

  switch (periodId) {
    case 'today':
      start = startOfDay(now);
      break;
    case '7d':
      start = startOfDay(now);
      start.setDate(start.getDate() - 6);
      break;
    case '30d':
      start = startOfDay(now);
      start.setDate(start.getDate() - 29);
      break;
    case '90d':
      start = startOfDay(now);
      start.setDate(start.getDate() - 89);
      break;
    case 'all':
      return { from: null, to: end.toISOString() };
    default:
      start = startOfDay(now);
      start.setDate(start.getDate() - 29);
  }

  return { from: start.toISOString(), to: end.toISOString() };
}

export function formatGrowthPct(growthPct) {
  if (growthPct == null) {
    return { text: 'Sin base para comparar', tone: 'muted' };
  }
  if (growthPct === 0) {
    return { text: 'Sin cambio vs período anterior', tone: 'neutral' };
  }
  const sign = growthPct > 0 ? '+' : '';
  return {
    text: `${sign}${growthPct}% vs período anterior`,
    tone: growthPct > 0 ? 'positive' : 'negative',
  };
}

export function jobStatusLabel(status) {
  if (status === 'active') return 'Activa';
  if (status === 'closed') return 'Cerrada';
  if (status === 'paused') return 'Pausada';
  if (status === 'draft') return 'Borrador';
  return status || '—';
}

export function formatDaysActive(days) {
  if (days == null || Number.isNaN(Number(days))) return '—';
  const n = Number(days);
  if (n < 1) return '< 1 día';
  if (n === 1) return '1 día';
  return `${Math.round(n)} días`;
}

export const EMPTY_ANALYTICS_MESSAGE =
  'Aún no hay suficientes datos para generar estadísticas.';
