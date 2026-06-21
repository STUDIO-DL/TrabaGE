export const ROLES = {
  CANDIDATE: 'candidate',
  COMPANY: 'company',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [ROLES.CANDIDATE]: 'Candidato',
  [ROLES.COMPANY]: 'Empresa / institución',
  [ROLES.ADMIN]: 'Administrador',
};

export const ROLE_HOME = {
  [ROLES.CANDIDATE]: '/candidate/feed',
  [ROLES.COMPANY]: '/company/dashboard',
  [ROLES.ADMIN]: '/admin',
};

export const ROLE_SETUP = {
  [ROLES.CANDIDATE]: '/setup/candidate',
  [ROLES.COMPANY]: '/setup/company',
};
