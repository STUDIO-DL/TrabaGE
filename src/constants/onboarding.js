export const ONBOARDING_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export const ONBOARDING_ROUTE = '/onboarding';

export const ONBOARDING_TOTAL_STEPS = 8;
export const PROFESSIONAL_TOTAL_STEPS = ONBOARDING_TOTAL_STEPS;
export const STUDENT_TOTAL_STEPS = ONBOARDING_TOTAL_STEPS;
export const EXTENDED_TOTAL_STEPS = ONBOARDING_TOTAL_STEPS;
export const MAX_ONBOARDING_STEP = 10;

export const TRABAGE_GOALS = [
  {
    value: 'employment',
    icon: '💼',
    title: 'Encontrar empleo',
    description: 'Quiero descubrir oportunidades laborales.',
  },
  {
    value: 'services',
    icon: '🛠️',
    title: 'Ofrecer mis servicios',
    description: 'Quiero que otras personas puedan encontrarme.',
  },
  {
    value: 'both',
    icon: '🚀',
    title: 'Ambas',
    description: 'Quiero encontrar oportunidades y ofrecer mis servicios.',
  },
];

export const PROFESSIONS = [
  'Electricista',
  'Contable',
  'Administrador',
  'Programador',
  'Diseñador gráfico',
  'Mecánico',
  'Profesor',
  'Enfermero',
  'Técnico informático',
  'Marketing',
  'Construcción',
  'Fotógrafo',
  'Emprendedor',
];

export const STUDY_AREAS = [
  'Administración',
  'Informática',
  'Ingeniería',
  'Derecho',
  'Economía',
  'Medicina',
  'Educación',
  'Comunicación',
  'Arquitectura',
  'Otra',
];

export const STUDENT_SECTOR_INTERESTS = [
  'Tecnología e informática',
  'Administración y negocios',
  'Ingeniería',
  'Salud',
  'Derecho',
  'Diseño y comunicación',
  'Educación',
  'Ciencias',
  'Arquitectura y construcción',
  'Turismo y hostelería',
  'Medio ambiente',
  'Humanidades',
  'Otra',
];

export const STUDY_STAGES = [
  'Formación profesional',
  'Grado / Universidad',
  'Bachillerato',
  'Máster',
  'Doctorado',
  'Curso / Formación especializada',
  'Acabo de empezar',
];

export const EXPERIENCE_OPTIONS = [
  'Sin experiencia',
  'Menos de 1 año',
  '1–3 años',
  '3–5 años',
  '5–10 años',
  'Más de 10 años',
];

export const OPPORTUNITY_TYPES = [
  'Tiempo completo',
  'Medio tiempo',
  'Prácticas',
  'Remoto',
  'Freelance',
  'Cualquier oportunidad',
];

export const STUDENT_OPPORTUNITY_TYPES = [
  '🎓 Prácticas',
  '🕒 Medio tiempo',
  '💻 Remoto',
  '👨‍💼 Freelance',
  '🌱 Primer empleo',
  '🚀 Cualquier oportunidad',
];

export const DEFAULT_ONBOARDING_COUNTRY = 'Guinea Ecuatorial';

/** Países y ciudades principales disponibles en el onboarding. */
export const ONBOARDING_COUNTRIES = [
  {
    country: 'Guinea Ecuatorial',
    cities: ['Malabo', 'Bata', 'Mongomo', 'Ebibeyín', 'Otra ciudad'],
  },
  {
    country: 'Camerún',
    cities: ['Yaoundé', 'Douala', 'Garoua', 'Bamenda', 'Otra ciudad'],
  },
  {
    country: 'Senegal',
    cities: ['Dakar', 'Touba', 'Thiès', 'Saint-Louis', 'Otra ciudad'],
  },
  {
    country: 'Ghana',
    cities: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Otra ciudad'],
  },
  {
    country: 'España',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Otra ciudad'],
  },
  {
    country: 'Benín',
    cities: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Otra ciudad'],
  },
  {
    country: 'Nigeria',
    cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Otra ciudad'],
  },
  {
    country: 'Sudáfrica',
    cities: ['Johannesburgo', 'Ciudad del Cabo', 'Durban', 'Pretoria', 'Otra ciudad'],
  },
];

/** @deprecated Usar getCitiesForOnboardingCountry */
export const OPPORTUNITY_LOCATIONS = ONBOARDING_COUNTRIES[0].cities;

export function getOnboardingCountryNames() {
  return ONBOARDING_COUNTRIES.map((entry) => entry.country);
}

export function getCitiesForOnboardingCountry(country = DEFAULT_ONBOARDING_COUNTRY) {
  const entry = ONBOARDING_COUNTRIES.find((item) => item.country === country);
  return entry?.cities ?? ONBOARDING_COUNTRIES[0].cities;
}

export function getOpportunityCitiesForData(data = {}) {
  return getCitiesForOnboardingCountry(data.country || DEFAULT_ONBOARDING_COUNTRY);
}

export const SKILLS_BY_PROFESSION = {
  Administrador: [
    'Excel',
    'Gestión administrativa',
    'Contabilidad',
    'Atención al cliente',
    'Gestión de documentos',
    'Organización',
    'Recursos humanos',
    'Ventas',
    'Marketing',
    'Finanzas',
  ],
  Electricista: [
    'Instalaciones eléctricas',
    'Mantenimiento',
    'Cableado',
    'Electricidad industrial',
    'Lectura de planos',
    'Reparaciones',
  ],
  Programador: [
    'Flutter',
    'Dart',
    'JavaScript',
    'Python',
    'Desarrollo web',
    'Bases de datos',
    'Git',
    'APIs',
    'Figma',
    'Tecnología',
  ],
  'Diseñador gráfico': [
    'Photoshop',
    'Illustrator',
    'Figma',
    'Branding',
    'Diseño UI',
    'Edición de vídeo',
    'Diseño editorial',
  ],
  Contable: ['Excel', 'Contabilidad', 'Finanzas', 'Fiscalidad', 'Facturación', 'Organización'],
  Mecánico: ['Diagnóstico', 'Mantenimiento', 'Reparaciones', 'Herramientas', 'Motores'],
  Profesor: ['Comunicación', 'Planificación', 'Educación', 'Evaluación', 'Tutoría'],
  Enfermero: ['Atención al paciente', 'Primeros auxilios', 'Salud', 'Comunicación', 'Cuidados'],
  'Técnico informático': ['Soporte técnico', 'Redes', 'Hardware', 'Software', 'Bases de datos'],
  Marketing: ['Marketing digital', 'Ventas', 'Comunicación', 'Redes sociales', 'Contenido'],
  Construcción: ['Obra', 'Lectura de planos', 'Seguridad laboral', 'Herramientas', 'Medición'],
  Fotógrafo: ['Fotografía', 'Edición de imagen', 'Iluminación', 'Photoshop', 'Comunicación visual'],
  Emprendedor: ['Ventas', 'Gestión de proyectos', 'Marketing', 'Finanzas', 'Negociación'],
};

export const SKILLS_BY_STUDY_AREA = {
  Administración: [
    'Excel',
    'Contabilidad',
    'Gestión administrativa',
    'Marketing',
    'Finanzas',
    'Organización',
  ],
  Informática: [
    'Programación',
    'Python',
    'JavaScript',
    'Flutter',
    'Bases de datos',
    'Desarrollo web',
    'Git',
    'UI/UX',
  ],
  Ingeniería: ['Matemáticas', 'Diseño técnico', 'Resolución de problemas', 'AutoCAD', 'Proyectos'],
  Medicina: ['Atención al paciente', 'Primeros auxilios', 'Comunicación', 'Bioseguridad'],
  Derecho: ['Investigación jurídica', 'Redacción', 'Comunicación', 'Análisis'],
  Educación: ['Pedagogía', 'Comunicación', 'Planificación', 'Tutoría'],
  Comunicación: ['Figma', 'Diseño gráfico', 'Comunicación', 'Branding', 'Contenido'],
  Economía: ['Excel', 'Finanzas', 'Contabilidad', 'Análisis de datos', 'Investigación'],
  Arquitectura: ['AutoCAD', 'Diseño', 'Lectura de planos', 'Construcción'],
  'Administración y negocios': [
    'Excel',
    'Contabilidad',
    'Gestión administrativa',
    'Marketing',
    'Finanzas',
    'Organización',
  ],
  'Tecnología e informática': [
    'Programación',
    'Python',
    'JavaScript',
    'Flutter',
    'Bases de datos',
    'Desarrollo web',
    'Git',
    'UI/UX',
  ],
  Salud: ['Atención al paciente', 'Primeros auxilios', 'Comunicación', 'Bioseguridad'],
  'Diseño y comunicación': ['Figma', 'Diseño gráfico', 'Comunicación', 'Branding', 'Contenido'],
  Ciencias: ['Investigación', 'Análisis de datos', 'Laboratorio', 'Excel'],
  'Arquitectura y construcción': ['AutoCAD', 'Diseño', 'Lectura de planos', 'Construcción'],
  'Turismo y hostelería': ['Atención al cliente', 'Idiomas', 'Organización', 'Ventas'],
  'Medio ambiente': ['Sostenibilidad', 'Investigación', 'Gestión de proyectos', 'Educación ambiental'],
  Humanidades: ['Redacción', 'Investigación', 'Comunicación', 'Análisis'],
};

export const DEFAULT_SKILLS = [
  'Comunicación',
  'Organización',
  'Atención al cliente',
  'Gestión de proyectos',
  'Excel',
  'Ventas',
  'Marketing',
  'Tecnología',
];

export function normalizeOnboardingStatus(profile) {
  const status = profile?.onboarding_status;
  if (status === 'pending' || status === 'not_started') return ONBOARDING_STATUS.NOT_STARTED;
  return status || ONBOARDING_STATUS.NOT_STARTED;
}

export function isOnboardingCompleted(profile) {
  if (!profile) return false;
  if (profile.setup_complete === true && profile.onboarding_status === undefined) return true;
  return normalizeOnboardingStatus(profile) === ONBOARDING_STATUS.COMPLETED;
}

/** True when a personal account should enter or resume post-registration onboarding. */
export function shouldShowCandidateOnboarding(profile) {
  if (!profile) return true;
  return !isOnboardingCompleted(profile);
}

export function getOnboardingData(profile) {
  const raw = profile?.onboarding_data;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function getOnboardingCurrentStep(profile, data = getOnboardingData(profile)) {
  const raw = Number(profile?.onboarding_current_step || 1);
  if (!Number.isFinite(raw)) return 1;
  const total = getOnboardingTotalSteps(data);
  return Math.min(Math.max(Math.trunc(raw), 1), total);
}

export function getSkillsForOnboarding(data = {}) {
  if (data.user_type === 'student') {
    const areaKey = data.sector_interest || data.study_area;
    return SKILLS_BY_STUDY_AREA[areaKey] || DEFAULT_SKILLS;
  }
  return SKILLS_BY_PROFESSION[data.profession] || DEFAULT_SKILLS;
}

export function getOnboardingTotalSteps(_data = {}) {
  return ONBOARDING_TOTAL_STEPS;
}
