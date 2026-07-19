// Home/global search groups people, businesses and organizations only.
// Jobs are searched exclusively from the Empleos section, so 'job' is excluded.
export const SEARCH_ENTITY_ORDER = ['personal', 'business', 'organization'];

export const DEDICATED_SEARCH_ENTITY_ORDER = ['personal', 'companies', 'job'];

export const SEARCH_ENTITY_LABELS = {
  personal: 'Personas',
  business: 'Business',
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
