import { isOrganizationProfile, isOrganizationKind } from './orgLabels';

/** Who is viewing the content — drives second vs third person copy. */
export const VIEWER = {
  OWN: 'own',
  OTHER_PERSON: 'other_person',
  OTHER_BUSINESS: 'other_business',
  OTHER_ORGANIZATION: 'other_organization',
};

export function resolvePersonViewerContext({ isOwn }) {
  return isOwn ? VIEWER.OWN : VIEWER.OTHER_PERSON;
}

export function resolveOrgViewerContext({ isOwn, profile, orgKind = null }) {
  if (isOwn) return VIEWER.OWN;
  const isOrganization =
    isOrganizationKind(orgKind) || (profile ? isOrganizationProfile(profile) : false);
  return isOrganization ? VIEWER.OTHER_ORGANIZATION : VIEWER.OTHER_BUSINESS;
}

function pickCopy(map, viewer) {
  return map[viewer] ?? map[VIEWER.OTHER_BUSINESS] ?? '';
}

const EMPTY_POSTS = {
  [VIEWER.OWN]: 'No has publicado nada todavía.',
  [VIEWER.OTHER_PERSON]: 'Esta persona todavía no ha publicado nada.',
  [VIEWER.OTHER_BUSINESS]: 'Esta empresa todavía no ha publicado nada.',
  [VIEWER.OTHER_ORGANIZATION]: 'Esta organización todavía no ha publicado nada.',
};

const EMPTY_JOBS = {
  [VIEWER.OWN]: 'Todavía no has publicado ninguna oferta.',
  [VIEWER.OTHER_BUSINESS]: 'Esta empresa todavía no ha publicado ofertas.',
  [VIEWER.OTHER_ORGANIZATION]: 'Esta organización todavía no ha publicado ofertas.',
};

const EMPTY_FOLLOWERS = {
  [VIEWER.OWN]: 'Todavía no tienes seguidores.',
  [VIEWER.OTHER_PERSON]: 'Esta persona todavía no tiene seguidores.',
  [VIEWER.OTHER_BUSINESS]: 'Esta empresa todavía no tiene seguidores.',
  [VIEWER.OTHER_ORGANIZATION]: 'Esta organización todavía no tiene seguidores.',
};

const EMPTY_ABOUT_ORG = {
  [VIEWER.OWN]: 'Aún no has añadido información sobre tu perfil.',
  [VIEWER.OTHER_BUSINESS]: 'Esta empresa todavía no ha añadido información.',
  [VIEWER.OTHER_ORGANIZATION]: 'Esta organización todavía no ha añadido información.',
};

const PROFILE_SECTION_OWN = {
  about: 'Aún no has escrito nada sobre ti.',
  experience: 'Aún no has añadido experiencia laboral.',
  education: 'Aún no has añadido formación.',
  certifications: 'Aún no has añadido certificaciones.',
  skills: 'Aún no has añadido habilidades.',
  portfolio: 'Aún no has añadido enlaces de portafolio.',
  services: 'Aún no has añadido servicios.',
  languages: 'Aún no has añadido idiomas.',
  contact: 'Aún no has añadido datos de contacto.',
  social: 'Aún no has añadido redes sociales.',
};

export function getEmptyPostsCopy(viewer) {
  return pickCopy(EMPTY_POSTS, viewer);
}

export function getEmptyJobsCopy(viewer) {
  return pickCopy(EMPTY_JOBS, viewer);
}

export function getEmptyJobsOwnHint() {
  return 'Publica tu primera oferta desde el panel de empleos.';
}

export function getEmptyFollowersCopy(viewer) {
  return pickCopy(EMPTY_FOLLOWERS, viewer);
}

export function getEmptyAboutOrgCopy(viewer) {
  return pickCopy(EMPTY_ABOUT_ORG, viewer);
}

export function getProfileSectionEmptyCopy(section, isOwn) {
  if (!isOwn) return 'Sin información.';
  return PROFILE_SECTION_OWN[section] ?? 'Aún no has añadido información.';
}

/** Standard success toast messages (always end with a period). */
export const TOAST = {
  saved: 'Cambios guardados.',
  profileUpdated: 'Perfil actualizado.',
  postCreated: 'Publicación creada correctamente.',
  postUpdated: 'Publicación actualizada.',
  postDeleted: 'Publicación eliminada.',
  jobPublished: 'Oferta publicada.',
  jobDeleted: 'Oferta eliminada.',
  contactSaved: 'Contacto guardado.',
  appearanceUpdated: 'Apariencia actualizada.',
  applicationWithdrawn: 'Solicitud retirada.',
  statusUpdated: 'Estado actualizado.',
};

/** Human-friendly fallback when an operation fails unexpectedly. */
export const ERROR_GENERIC =
  'No hemos podido completar la operación. Inténtalo de nuevo.';
