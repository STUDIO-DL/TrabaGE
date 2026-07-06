import { INSTITUTION_COMPANY_TYPES } from '../constants/feedContentTypes';
import { ACCOUNT_KINDS } from '../constants/accountKinds';

export function isInstitutionProfile(profile) {
  return INSTITUTION_COMPANY_TYPES.includes(profile?.company_type);
}

export function isInstitutionKind(orgKind) {
  return orgKind === ACCOUNT_KINDS.INSTITUTION;
}

export function getOrgLabels(profile, orgKind = null) {
  const isInstitution =
    isInstitutionKind(orgKind) || (profile ? isInstitutionProfile(profile) : false);

  return {
    entity: isInstitution ? 'institución' : 'empresa',
    entityCapitalized: isInstitution ? 'Institución' : 'Empresa',
    profile: isInstitution ? 'Perfil de institución' : 'Perfil de empresa',
    verified: isInstitution ? 'Institución verificada' : 'Empresa verificada',
    defaultName: isInstitution ? 'Tu institución' : 'Tu empresa',
    welcome: isInstitution ? 'Bienvenido de nuevo' : 'Bienvenido de nuevo',
    createOffer: isInstitution ? 'Crear convocatoria' : 'Crear oferta',
  };
}
