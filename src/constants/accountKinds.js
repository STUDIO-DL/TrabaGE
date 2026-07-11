import { Building2, Landmark, User } from 'lucide-react';
import { ROLES } from './roles';

export const ACCOUNT_KINDS = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  ORGANIZATION: 'organization',
};

export const ACCOUNT_KIND_OPTIONS = [
  {
    id: ACCOUNT_KINDS.PERSONAL,
    label: 'Cuenta Personal',
    description: 'Busco oportunidades laborales y construyo mi perfil profesional',
    icon: User,
  },
  {
    id: ACCOUNT_KINDS.BUSINESS,
    label: 'Cuenta Business',
    description: 'Publico ofertas y encuentro talento para mi negocio',
    icon: Building2,
  },
  {
    id: ACCOUNT_KINDS.ORGANIZATION,
    label: 'Cuenta de Organización',
    description: 'Conectamos educación y oportunidades desde nuestra organización',
    icon: Landmark,
  },
];

/** Maps registration account kind → persisted user_roles.role (1:1). */
export function accountKindToRole(kind) {
  if (kind === ACCOUNT_KINDS.PERSONAL) return ROLES.PERSONAL;
  if (kind === ACCOUNT_KINDS.BUSINESS) return ROLES.BUSINESS;
  if (kind === ACCOUNT_KINDS.ORGANIZATION) return ROLES.ORGANIZATION;
  // Legacy registration values (bookmarks / in-flight signups)
  if (kind === 'candidate') return ROLES.PERSONAL;
  if (kind === 'company') return ROLES.BUSINESS;
  if (kind === 'institution') return ROLES.ORGANIZATION;
  return null;
}

export function isValidAccountKind(kind) {
  return Object.values(ACCOUNT_KINDS).includes(kind) ||
    kind === 'candidate' ||
    kind === 'company' ||
    kind === 'institution';
}

/** Normalize legacy account_kind metadata to official values. */
export function normalizeAccountKind(kind) {
  if (kind === ACCOUNT_KINDS.PERSONAL || kind === 'candidate') return ACCOUNT_KINDS.PERSONAL;
  if (kind === ACCOUNT_KINDS.BUSINESS || kind === 'company') return ACCOUNT_KINDS.BUSINESS;
  if (kind === ACCOUNT_KINDS.ORGANIZATION || kind === 'institution') {
    return ACCOUNT_KINDS.ORGANIZATION;
  }
  return null;
}
