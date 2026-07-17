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
 * Spanish labels for Cuenta Business vs Cuenta de Organización surfaces.
 * Use "empresa"/"organización" only for third-person profile context (e.g. empty states).
 * Account-type naming always follows roles.js: Cuenta Business / Cuenta de Organización.
 */
export function getOrgLabels(profile, orgKind = null) {
  const isOrganization =
    isOrganizationKind(orgKind) || (profile ? isOrganizationProfile(profile) : false);

  return {
    entity: isOrganization ? 'organización' : 'empresa',
    entityCapitalized: isOrganization ? 'Organización' : 'Empresa',
    profile: isOrganization ? 'Perfil de organización' : 'Perfil Business',
    verified: isOrganization ? 'Organización verificada' : 'Cuenta Business verificada',
    defaultName: isOrganization ? 'Tu organización' : 'Tu cuenta Business',
    notFound: isOrganization ? 'Organización no encontrada' : 'Perfil no encontrado',
    welcome: 'Bienvenido de nuevo',
    createOffer: isOrganization ? 'Crear convocatoria' : 'Crear oferta',
    followPrompt: isOrganization
      ? 'Inicia sesión para seguir organizaciones'
      : 'Inicia sesión para seguir cuentas Business',
  };
}
