import { ROLES } from './roles';

/** Discover hub category definitions — visibility per account role. */
export const DISCOVER_SECTIONS = [
  {
    id: 'hiring',
    title: 'Empresas que están contratando',
    pathSuffix: '/discover/hiring',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS],
  },
  {
    id: 'scholarships',
    title: 'Becas',
    pathSuffix: '/discover/scholarships',
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
  {
    id: 'internships',
    title: 'Prácticas',
    pathSuffix: '/discover/internships',
    roles: [ROLES.PERSONAL],
  },
  {
    id: 'events',
    title: 'Eventos',
    pathSuffix: '/discover/events',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS, ROLES.ORGANIZATION],
  },
  {
    id: 'calls',
    title: 'Convocatorias',
    pathSuffix: '/discover/calls',
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
  {
    id: 'courses',
    title: 'Cursos y certificaciones',
    pathSuffix: '/discover/courses',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS, ROLES.ORGANIZATION],
  },
  {
    id: 'entrepreneurs',
    title: 'Emprendedores',
    pathSuffix: '/discover/entrepreneurs',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS],
  },
  {
    id: 'volunteering',
    title: 'Voluntariado',
    pathSuffix: '/discover/volunteering',
    roles: [ROLES.PERSONAL],
  },
  {
    id: 'international',
    title: 'Oportunidades internacionales',
    pathSuffix: '/discover/international',
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
];

export function getDiscoverSectionsForRole(role) {
  return DISCOVER_SECTIONS.filter((section) => section.roles.includes(role));
}
