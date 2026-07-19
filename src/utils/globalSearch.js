// Home/global search groups people, businesses, organizations, and optionally jobs.
export const SEARCH_ENTITY_ORDER = ['personal', 'business', 'organization', 'job'];

export const DEDICATED_SEARCH_ENTITY_ORDER = ['personal', 'companies', 'job'];

export const SEARCH_ENTITY_LABELS = {
  personal: 'Personas',
  business: 'Empresas',
  organization: 'Organizaciones',
  // Legacy result_type aliases from search RPC during transition
  candidate: 'Personas',
  company: 'Business',
  institution: 'Organizaciones',
  job: 'Empleos',
};

export const DEDICATED_SEARCH_ENTITY_LABELS = {
  personal: 'Usuarios',
  companies: 'Empresas',
  job: 'Empleos',
};

export const DEDICATED_SEARCH_ENTITY_TYPE_LABELS = {
  personal: 'Usuario',
  business: 'Empresa',
  organization: 'Empresa',
  candidate: 'Usuario',
  company: 'Empresa',
  institution: 'Empresa',
  job: 'Empleo',
};

export const SEARCH_ENTITY_TYPE_LABELS = {
  personal: 'Persona',
  business: 'Business',
  organization: 'Organización',
  candidate: 'Persona',
  company: 'Business',
  institution: 'Organización',
  job: 'Empleo',
};

function normalizeSearchType(type) {
  if (type === 'candidate') return 'personal';
  if (type === 'company') return 'business';
  if (type === 'institution') return 'organization';
  return type;
}

export function groupSearchResults(results = []) {
  const groups = SEARCH_ENTITY_ORDER.map((type) => ({
    type,
    label: SEARCH_ENTITY_LABELS[type],
    items: [],
  }));

  const groupMap = Object.fromEntries(groups.map((group) => [group.type, group]));

  results.forEach((item) => {
    const type = normalizeSearchType(item.type);
    const group = groupMap[type];
    if (group) group.items.push(item);
  });

  return groups.filter((group) => group.items.length > 0);
}

export function groupDedicatedSearchResults(results = []) {
  const groups = DEDICATED_SEARCH_ENTITY_ORDER.map((type) => ({
    type,
    label: DEDICATED_SEARCH_ENTITY_LABELS[type],
    items: [],
  }));

  const groupMap = Object.fromEntries(groups.map((group) => [group.type, group]));

  results.forEach((item) => {
    const type = normalizeSearchType(item.type);
    if (type === 'personal') {
      groupMap.personal.items.push(item);
    } else if (type === 'business' || type === 'organization') {
      groupMap.companies.items.push(item);
    } else if (type === 'job') {
      groupMap.job.items.push(item);
    }
  });

  return groups.filter((group) => group.items.length > 0);
}

const ORGANIZATION_CATEGORY_LABELS = {
  'Institucion publica': 'Institución pública',
  ONG: 'Organización sin ánimo de lucro',
};

function formatOrganizationCategory(value) {
  if (!value) return null;
  return ORGANIZATION_CATEGORY_LABELS[value] ?? value;
}

/**
 * Splits the RPC-composed subtitle into professional secondary info and optional location.
 * global_search builds subtitles as: headline • city | sector • city | company_type • city
 */
export function resolveSearchResultDisplay(item) {
  const type = normalizeSearchType(item.type);
  const subtitle = item.subtitle?.trim();

  if (!subtitle) {
    return { secondary: null, location: null };
  }

  const parts = subtitle
    .split(' • ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (type === 'organization') {
    return {
      secondary: formatOrganizationCategory(parts[0]) ?? parts[0] ?? null,
      location: parts[1] ?? null,
    };
  }

  if (type === 'personal' || type === 'business' || type === 'job') {
    return {
      secondary: parts[0] ?? null,
      location: parts[1] ?? null,
    };
  }

  return { secondary: subtitle, location: null };
}
