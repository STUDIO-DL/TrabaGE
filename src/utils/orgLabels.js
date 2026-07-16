import { ORGANIZATION_COMPANY_TYPES } from '../constants/feedContentTypes';
import { ACCOUNT_KINDS } from '../constants/accountKinds';
import { ROLES } from '../constants/roles';

export function isOrganizationProfile(profile) {
  return ORGANIZATION_COMPANY_TYPES.includes(profile?.company_type);
}

/** @deprecated Use isOrganizationProfile */
export function isInstitutionProfile(profile) {
  return isOrganizationProfile(profile);
}

export function isOrganizationKind(orgKind) {
  return (
    orgKind === ACCOUNT_KINDS.ORGANIZATION ||
    orgKind === 'institution' ||
    orgKind === ROLES.ORGANIZATION
  );
}

/** @deprecated Use isOrganizationKind */
export function isInstitutionKind(orgKind) {
  return isOrganizationKind(orgKind);
}

/**
 * Spanish labels for Business vs Organization surfaces.
 * Prefer "Business"/"Negocio" and "Organización" — never mix the two concepts.
 */
export function getOrgLabels(profile, orgKind = null) {
  const isOrganization =
    isOrganizationKind(orgKind) || (profile ? isOrganizationProfile(profile) : false);

  return {
    entity: isOrganization ? 'organización' : 'negocio',
    entityCapitalized: isOrganization ? 'Organización' : 'Negocio',
    profile: isOrganization ? 'Perfil de organización' : 'Perfil de negocio',
    verified: isOrganization ? 'Organización verificada' : 'Negocio verificado',
    defaultName: isOrganization ? 'Tu organización' : 'Tu negocio',
    notFound: isOrganization ? 'Organización no encontrada' : 'Empresa no encontrada',
    welcome: 'Bienvenido de nuevo',
    createOffer: isOrganization ? 'Crear convocatoria' : 'Crear oferta',
    followPrompt: isOrganization
      ? 'Inicia sesión para seguir organizaciones'
      : 'Inicia sesión para seguir negocios',
  };
}
