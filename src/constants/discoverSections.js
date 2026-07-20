import {
  Briefcase,
  Building2,
  Calendar,
  Globe,
  GraduationCap,
  Landmark,
  Sparkles,
  Target,
  Users,
} from './icons';
import { ROLES } from './roles';

/** Discover hub card definitions — visibility per account role. */
export const DISCOVER_SECTIONS = [
  {
    id: 'hiring',
    title: 'Empresas contratando',
    description: 'Empresas con vacantes activas',
    icon: Building2,
    pathSuffix: '/discover/hiring',
    featured: true,
    roles: [ROLES.PERSONAL, ROLES.BUSINESS],
  },
  {
    id: 'scholarships',
    title: 'Becas',
    description: 'Ayudas y becas de formación',
    icon: GraduationCap,
    pathSuffix: '/discover/scholarships',
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
  {
    id: 'internships',
    title: 'Prácticas',
    description: 'Oportunidades de prácticas',
    icon: Briefcase,
    pathSuffix: '/discover/internships',
    roles: [ROLES.PERSONAL],
  },
  {
    id: 'events',
    title: 'Eventos',
    description: 'Ferias, congresos y jornadas',
    icon: Calendar,
    pathSuffix: '/discover/events',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS, ROLES.ORGANIZATION],
  },
  {
    id: 'calls',
    title: 'Convocatorias',
    description: 'Convocatorias de organizaciones',
    icon: Landmark,
    pathSuffix: '/discover/calls',
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
  {
    id: 'courses',
    title: 'Cursos y certificaciones',
    description: 'Formación y certificados',
    icon: Sparkles,
    pathSuffix: '/discover/courses',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS, ROLES.ORGANIZATION],
  },
  {
    id: 'entrepreneurs',
    title: 'Emprendedores',
    description: 'Startups y programas',
    icon: Target,
    pathSuffix: '/discover/entrepreneurs',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS],
  },
  {
    id: 'new-companies',
    title: 'Nuevas empresas',
    description: 'Empresas recién registradas',
    icon: Building2,
    pathSuffix: '/discover/new-companies',
    roles: [ROLES.PERSONAL, ROLES.BUSINESS],
  },
  {
    id: 'volunteering',
    title: 'Voluntariado',
    description: 'Proyectos y causas sociales',
    icon: Users,
    pathSuffix: '/discover/volunteering',
    roles: [ROLES.PERSONAL],
  },
  {
    id: 'international',
    title: 'Oportunidades internacionales',
    description: 'Empleo remoto y en el extranjero',
    icon: Globe,
    pathSuffix: '/discover/international',
    roles: [ROLES.PERSONAL, ROLES.ORGANIZATION],
  },
];

export function getDiscoverSectionsForRole(role) {
  return DISCOVER_SECTIONS.filter((section) => section.roles.includes(role));
}

export function getDiscoverGridSections(role) {
  return getDiscoverSectionsForRole(role).filter((section) => !section.featured);
}

export function getDiscoverFeaturedSection(role) {
  return getDiscoverSectionsForRole(role).find((section) => section.featured) ?? null;
}
