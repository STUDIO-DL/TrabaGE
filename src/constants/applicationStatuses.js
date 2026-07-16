/**
 * Application status values (English in DB) with Spanish display labels.
 * `interview` is reserved for a future employer workflow — not yet in DB constraint.
 */
export const APPLICATION_STATUSES = [
  { value: 'pending', label: 'Pendiente', variant: 'pending' },
  { value: 'viewed', label: 'En revisión', variant: 'info' },
  { value: 'contacted', label: 'Preseleccionado', variant: 'primary' },
  { value: 'interview', label: 'Entrevista', variant: 'info' },
  { value: 'accepted', label: 'Aceptado', variant: 'success' },
  { value: 'rejected', label: 'Rechazado', variant: 'error' },
  { value: 'withdrawn', label: 'Retirada', variant: 'default' },
];

/** Statuses employers can set via the dashboard (matches DB constraint). */
export const EMPLOYER_APPLICATION_STATUSES = APPLICATION_STATUSES.filter(
  (s) => s.value !== 'interview' && s.value !== 'withdrawn',
);

export const getApplicationStatus = (value) =>
  APPLICATION_STATUSES.find((s) => s.value === value) ?? {
    value: value ?? 'pending',
    label: 'Estado desconocido',
    variant: 'default',
  };
