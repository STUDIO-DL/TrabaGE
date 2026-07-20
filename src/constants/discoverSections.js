import { AUTHOR_TYPES } from './authorTypes';
import { ROLES } from './roles';

/** Discover hub sections — each maps to a Tema (topic slug) on publications. */
export const DISCOVER_SECTIONS = [
  {
    id: 'hiring',
    title: 'Empresas que están contratando',
    pathSuffix: '/discover/hiring',
    topicSlug: 'contratacion',
    authorTypes: [AUTHOR_TYPES.BUSINESS, 'company'],
    roles: [ROLES.PERSONAL, ROLES.BUSINESS],
  },
  {
    id: 'scholarships',
    title: 'Becas',
    pathSuffix: '/discover/scholarships',
    topicSlug: 'becas',
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
  {
    id: 'internships',
    title: 'Prácticas',
    pathSuffix: '/discover/internships',
    topicSlug: 'practicas',
    roles: [ROLES.PERSONAL],
  },
  {
    id: 'events',
    title: 'Eventos',
    pathSuffix: '/discover/events',
    topicSlug: 'eventos',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS, ROLES.ORGANIZATION],
  },
  {
    id: 'calls',
    title: 'Convocatorias',
    pathSuffix: '/discover/calls',
    topicSlug: 'convocatorias',
    authorTypes: [AUTHOR_TYPES.ORGANIZATION, 'institution'],
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
  {
    id: 'courses',
    title: 'Cursos y certificaciones',
    pathSuffix: '/discover/courses',
    topicSlug: 'cursos-certificaciones',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS, ROLES.ORGANIZATION],
  },
  {
    id: 'entrepreneurs',
    title: 'Emprendedores',
    pathSuffix: '/discover/entrepreneurs',
    topicSlug: 'emprendimiento',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS],
  },
  {
    id: 'volunteering',
    title: 'Voluntariado',
    pathSuffix: '/discover/volunteering',
    topicSlug: 'voluntariado',
    roles: [ROLES.PERSONAL],
  },
  {
    id: 'international',
    title: 'Oportunidades internacionales',
    pathSuffix: '/discover/international',
    topicSlug: 'oportunidades-internacionales',
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
];

export function getDiscoverSectionsForRole(role) {
  return DISCOVER_SECTIONS.filter((section) => section.roles.includes(role));
}

export function getDiscoverSectionById(sectionId) {
  return DISCOVER_SECTIONS.find((section) => section.id === sectionId) ?? null;
}
