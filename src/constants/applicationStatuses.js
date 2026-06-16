export const APPLICATION_STATUSES = [
  { value: 'pending', label: 'Pendiente', variant: 'pending' },
  { value: 'viewed', label: 'Visto', variant: 'default' },
  { value: 'contacted', label: 'Contactado', variant: 'success' },
  { value: 'rejected', label: 'Rechazado', variant: 'error' },
  { value: 'hired', label: 'Contratado', variant: 'success' },
];

export const getApplicationStatus = (value) =>
  APPLICATION_STATUSES.find((s) => s.value === value) ?? APPLICATION_STATUSES[0];
