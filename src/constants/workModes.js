export const WORK_MODES = [
  { value: 'on-site', label: 'Presencial' },
  { value: 'remote', label: 'Remoto' },
  { value: 'hybrid', label: 'Híbrido' },
];

export const getWorkModeLabel = (value) =>
  WORK_MODES.find((m) => m.value === value)?.label ?? value;
