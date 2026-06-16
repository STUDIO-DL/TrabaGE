export const formatSalary = (salary, salaryNegotiable = false) => {
  if (salaryNegotiable) return 'Salario negociable';
  if (!salary) return 'Salario no especificado';
  return salary;
};
