/** Period presets and helpers for admin analytics filters. */

export const ANALYTICS_PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: 'this_month', label: 'Este mes' },
  { id: '3m', label: 'Últimos 3 meses' },
  { id: '6m', label: 'Últimos 6 meses' },
  { id: 'this_year', label: 'Este año' },
  { id: 'last_year', label: 'Año anterior' },
  { id: 'custom', label: 'Período personalizado' },
];

export const ANALYTICS_TABS = [
  { id: 'summary', label: 'Resumen', path: 'resumen' },
  { id: 'users', label: 'Usuarios', path: 'usuarios' },
  { id: 'employers', label: 'Empresas y organizaciones', path: 'empresas' },
  { id: 'market', label: 'Mercado laboral', path: 'mercado' },
  { id: 'jobs', label: 'Empleos y demanda', path: 'empleos' },
  { id: 'skills', label: 'Habilidades', path: 'habilidades' },
  { id: 'geography', label: 'Análisis geográfico', path: 'geografia' },
  { id: 'trends', label: 'Tendencias', path: 'tendencias' },
  { id: 'reports', label: 'Informes', path: 'informes' },
];

/** Youth tab reserved for a future voluntary age field — not shown in Phase 1. */
export const ANALYTICS_FUTURE_TABS = [
  { id: 'youth', label: 'Jóvenes y perfiles profesionales', reason: 'Requiere edad voluntaria' },
];

export const JOB_TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'full-time', label: 'Jornada completa' },
  { value: 'part-time', label: 'Media jornada' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Prácticas' },
];

export const WORK_MODE_OPTIONS = [
  { value: '', label: 'Todas las modalidades' },
  { value: 'on-site', label: 'Presencial' },
  { value: 'remote', label: 'Remoto' },
  { value: 'hybrid', label: 'Híbrido' },
];

export const ACCOUNT_ROLE_OPTIONS = [
  { value: '', label: 'Todos los tipos de cuenta' },
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Empresa' },
  { value: 'organization', label: 'Organización' },
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

export function resolveAnalyticsPeriod(periodId, customFrom, customTo) {
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
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '3m':
      start = startOfDay(now);
      start.setMonth(start.getMonth() - 3);
      break;
    case '6m':
      start = startOfDay(now);
      start.setMonth(start.getMonth() - 6);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1);
      return {
        from: start.toISOString(),
        to: new Date(now.getFullYear(), 0, 1).toISOString(),
      };
    case 'custom': {
      if (!customFrom || !customTo) {
        start = startOfDay(now);
        start.setDate(start.getDate() - 29);
        break;
      }
      const from = startOfDay(customFrom);
      const to = startOfNextDay(customTo);
      if (to <= from) {
        start = startOfDay(now);
        start.setDate(start.getDate() - 29);
        break;
      }
      return { from: from.toISOString(), to: to.toISOString() };
    }
    default:
      start = startOfDay(now);
      start.setDate(start.getDate() - 29);
  }

  return { from: start.toISOString(), to: end.toISOString() };
}

export function formatDelta(current, previous) {
  if (previous == null || current == null) return null;
  if (previous === 0 && current === 0) return { text: 'Sin cambio', tone: 'neutral' };
  if (previous === 0) return { text: 'Datos insuficientes para comparar', tone: 'muted' };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(1)}% vs período anterior`,
    tone: pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral',
  };
}

export function hasRankingData(rows) {
  return Array.isArray(rows) && rows.length > 0;
}
