export const APPLICATION_STATUSES = [
  { value: 'pending', label: 'En revisión', variant: 'pending' },
  { value: 'viewed', label: 'Vista por la empresa', variant: 'default' },
  { value: 'contacted', label: 'Contactado', variant: 'success' },
  { value: 'accepted', label: 'Aceptada', variant: 'success' },
  { value: 'rejected', label: 'Rechazada', variant: 'error' },
  { value: 'withdrawn', label: 'Retirada', variant: 'default' },
];

export const getApplicationStatus = (value) =>
  APPLICATION_STATUSES.find((s) => s.value === value) ?? APPLICATION_STATUSES[0];
