export const PROFESSIONAL_PANEL_PERIODS = [
  { id: '7d', label: 'Últimos 7 días', days: 7 },
  { id: '30d', label: 'Últimos 30 días', days: 30 },
  { id: '90d', label: 'Últimos 90 días', days: 90 },
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

export function resolveProfessionalPanelPeriod(periodId = '30d') {
  const now = new Date();
  const end = startOfNextDay(now);
  const start = startOfDay(now);
  const days = PROFESSIONAL_PANEL_PERIODS.find((p) => p.id === periodId)?.days ?? 30;
  start.setDate(start.getDate() - (days - 1));
  return { from: start.toISOString(), to: end.toISOString(), days };
}

export function formatPanelCount(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('es-ES').format(n);
}
