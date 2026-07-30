import { ROLES, getRolePathPrefix, isEmployerRole, rolePath } from './roles';

/** Primary mobile bottom / desktop sidebar destinations (personal). */
export function buildPersonalNav(role = ROLES.PERSONAL) {
  return [
    { to: rolePath(role, '/feed'), label: 'Inicio', icon: 'home' },
    { to: rolePath(role, '/jobs'), label: 'Empleos', icon: 'briefcase' },
    { to: rolePath(role, '/publish'), label: 'Publicar', icon: 'publish' },
    { to: rolePath(role, '/notifications'), label: 'Notificaciones', icon: 'bell', showBadge: true },
    { to: rolePath(role, '/profile'), label: 'Perfil', icon: 'user' },
  ];
}

export function isEmployerPublishActive(pathname, role) {
  const prefix = getRolePathPrefix(role);
  if (!prefix) return false;

  return (
    pathname === `${prefix}/publish` ||
    pathname === `${prefix}/jobs/create` ||
    new RegExp(`^${prefix}/jobs/[^/]+/edit$`).test(pathname)
  );
}

/** Employer bottom nav / desktop app sidebar (parity with mobile). */
export function buildEmployerNav(role) {
  const employerRole = role ?? ROLES.BUSINESS;
  return [
    { to: rolePath(employerRole, '/feed'), label: 'Inicio', icon: 'home' },
    { to: rolePath(employerRole, '/dashboard'), label: 'Dashboard', icon: 'dashboard' },
    {
      to: rolePath(employerRole, '/publish'),
      label: 'Publicar',
      icon: 'publish',
      prominent: true,
    },
    {
      to: rolePath(employerRole, '/notifications'),
      label: 'Notificaciones',
      icon: 'bell',
      showBadge: true,
    },
    { to: rolePath(employerRole, '/profile'), label: 'Perfil', icon: 'user' },
  ];
}

export function buildAppNav(role) {
  if (isEmployerRole(role)) return buildEmployerNav(role);
  return buildPersonalNav(ROLES.PERSONAL);
}
