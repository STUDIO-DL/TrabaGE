export const MONTH_OPTIONS = [
  { value: '', label: 'Mes' },
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export function buildYearOptions({ yearsBack = 80, yearsForward = 1 } = {}) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear + yearsForward; year >= currentYear - yearsBack; year -= 1) {
    years.push({ value: String(year), label: String(year) });
  }
  return [{ value: '', label: 'Año' }, ...years];
}

export function parseMonthYear(isoDate) {
  if (!isoDate) return { month: '', year: '' };
  const match = String(isoDate).match(/^(\d{4})-(\d{2})/);
  if (!match) return { month: '', year: '' };
  return { month: String(Number(match[2])), year: match[1] };
}

export function toStartDate(month, year) {
  if (!month || !year) return null;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function toEndDate(month, year) {
  if (!month || !year) return null;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export function compareMonthYear(aMonth, aYear, bMonth, bYear) {
  const a = Number(aYear) * 12 + Number(aMonth);
  const b = Number(bYear) * 12 + Number(bMonth);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return a - b;
}
