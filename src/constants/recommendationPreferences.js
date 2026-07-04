export const MATCH_THRESHOLD = 70;

export const SCORE_WEIGHTS = {
  skills: 40,
  experience: 20,
  location: 15,
  workMode: 10,
  preferences: 10,
  recentActivity: 5,
};

export const JOB_CATEGORIES = [
  'Tecnología',
  'Construcción',
  'Educación',
  'Salud',
  'Transporte',
  'Hostelería',
  'Finanzas',
  'Comercio',
  'Energía',
  'Agricultura',
  'Telecomunicaciones',
  'Administración pública',
  'Legal',
  'Marketing',
  'Manufactura',
  'Otro',
];

export const EXPERIENCE_LEVELS = [
  { value: 'none', label: 'Sin experiencia' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Intermedio' },
  { value: 'senior', label: 'Senior' },
];

export const AVAILABILITY_OPTIONS = [
  { value: 'immediate', label: 'Disponible inmediatamente' },
  { value: '30_days', label: 'Disponible en 30 días' },
];

export const NOTIFICATION_FREQUENCIES = [
  { value: 'instant', label: 'Instantáneo' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
];

export const getExperienceLevelLabel = (value) =>
  EXPERIENCE_LEVELS.find((item) => item.value === value)?.label ?? value;

export const getNotificationFrequencyLabel = (value) =>
  NOTIFICATION_FREQUENCIES.find((item) => item.value === value)?.label ?? value;
