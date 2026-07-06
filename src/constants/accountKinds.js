import { Building2, Landmark, User } from 'lucide-react';
import { ROLES } from './roles';

export const ACCOUNT_KINDS = {
  CANDIDATE: 'candidate',
  COMPANY: 'company',
  INSTITUTION: 'institution',
};

export const ACCOUNT_KIND_OPTIONS = [
  {
    id: ACCOUNT_KINDS.CANDIDATE,
    label: 'Candidato',
    description: 'Busco oportunidades laborales',
    icon: User,
  },
  {
    id: ACCOUNT_KINDS.COMPANY,
    label: 'Empresa',
    description: 'Publico ofertas y encuentro talento',
    icon: Building2,
  },
  {
    id: ACCOUNT_KINDS.INSTITUTION,
    label: 'Institución',
    description: 'Conectamos educación con oportunidades',
    icon: Landmark,
  },
];

export function accountKindToRole(kind) {
  if (kind === ACCOUNT_KINDS.CANDIDATE) return ROLES.CANDIDATE;
  if (kind === ACCOUNT_KINDS.COMPANY || kind === ACCOUNT_KINDS.INSTITUTION) return ROLES.COMPANY;
  return null;
}

export function isValidAccountKind(kind) {
  return Object.values(ACCOUNT_KINDS).includes(kind);
}
