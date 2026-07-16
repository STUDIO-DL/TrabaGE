const XAF_SUFFIX = ' XAF';
const RANGE_SEPARATOR = ' - ';

/** Extract positive integer amounts from free-form salary text (supports ranges). */
export function parseSalaryAmounts(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  return raw
    .split(/\s*[-–—]\s*/)
    .map((part) => {
      const digits = part.replace(/\D/g, '');
      if (!digits) return null;
      const num = Number(digits);
      return Number.isFinite(num) && num > 0 ? num : null;
    })
    .filter((amount) => amount !== null);
}

/** Format integer with dot thousands separator (Equatorial Guinea / XAF convention). */
export function formatXafNumber(value) {
  const num =
    typeof value === 'number' ? value : Number(String(value ?? '').replace(/\D/g, ''));
  if (!Number.isFinite(num) || num <= 0) return null;
  return String(Math.trunc(num)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format salary as XAF amount(s).
 * 600000 → "600.000 XAF"
 * "500000-800000" → "500.000 - 800.000 XAF"
 */
export function formatXafAmount(value, { includeCurrency = true } = {}) {
  const amounts = parseSalaryAmounts(value);
  if (!amounts.length) return null;

  const formatted = amounts
    .map((amount) => formatXafNumber(amount))
    .filter(Boolean)
    .join(RANGE_SEPARATOR);

  if (!formatted) return null;
  return includeCurrency ? `${formatted}${XAF_SUFFIX}` : formatted;
}

/** Normalize user input for blur/save — formats numeric values, keeps legacy free text. */
export function normalizeSalaryInput(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';

  const formatted = formatXafAmount(trimmed, { includeCurrency: true });
  return formatted ?? trimmed;
}

export function formatSalaryAmount(salary) {
  const value = typeof salary === 'string' ? salary.trim() : salary;
  if (!value) return null;

  const formatted = formatXafAmount(value, { includeCurrency: true });
  if (formatted) return formatted;

  return String(value);
}

export function hasSalaryDisplay(salary, salaryNegotiable = false) {
  return Boolean(formatSalaryAmount(salary)) || Boolean(salaryNegotiable);
}

/** Inline text for detail views — supports salary + negotiable together. */
export const formatSalary = (salary, salaryNegotiable = false) => {
  const amount = formatSalaryAmount(salary);
  const parts = [];

  if (amount) parts.push(amount);
  if (salaryNegotiable) parts.push('Negociable');

  if (parts.length) return parts.join(' · ');
  return 'Salario no especificado';
};
