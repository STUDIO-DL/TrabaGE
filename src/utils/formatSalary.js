export function formatSalaryAmount(salary) {
  const value = typeof salary === 'string' ? salary.trim() : salary;
  if (!value) return null;
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
