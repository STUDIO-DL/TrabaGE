/**
 * Shared empty / fetch copy — product language for TrabaGE content surfaces.
 * Discover people uses a dedicated exception (see DISCOVER_PEOPLE_*).
 */

export const EMPTY_CONTENT_TITLE = 'No hay contenido disponible en este momento.';

export const EMPTY_CONTENT_SECONDARY = {
  default: null,
  jobs: 'Vuelve más tarde para descubrir nuevas oportunidades.',
  publications: null,
  scholarships: null,
  events: null,
  internships: null,
  feed: null,
  hiring: null,
  calls: null,
  courses: null,
  entrepreneurs: null,
  volunteering: null,
  international: null,
};

export const FETCH_ERROR_TITLE = 'No pudimos cargar esta información.';
export const FETCH_ERROR_DESCRIPTION = 'Revisa tu conexión y prueba de nuevo.';

/** Descubrir personas — only when no other recommendable users exist. */
export const DISCOVER_PEOPLE_EMPTY_TITLE =
  'Aún no hay suficientes personas para mostrarte recomendaciones.';
export const DISCOVER_PEOPLE_EMPTY_DESCRIPTION =
  'Cuando más profesionales se unan a TrabaGE, empezaremos a recomendarte perfiles relevantes.';
