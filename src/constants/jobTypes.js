export const JOB_TYPES = [
  { value: 'full-time', label: 'Tiempo completo' },
  { value: 'part-time', label: 'Medio tiempo' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Prácticas' },
];

export const getJobTypeLabel = (value) =>
  JOB_TYPES.find((t) => t.value === value)?.label ?? value;
