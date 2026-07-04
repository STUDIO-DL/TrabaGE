export const SEARCH_ENTITY_ORDER = ['candidate', 'company', 'institution', 'job'];

export const SEARCH_ENTITY_LABELS = {
  candidate: 'Personas',
  company: 'Empresas',
  institution: 'Instituciones',
  job: 'Empleos',
};

export const SEARCH_ENTITY_TYPE_LABELS = {
  candidate: 'Persona',
  company: 'Empresa',
  institution: 'Institución',
  job: 'Empleo',
};

export function groupSearchResults(results = []) {
  const groups = SEARCH_ENTITY_ORDER.map((type) => ({
    type,
    label: SEARCH_ENTITY_LABELS[type],
    items: [],
  }));

  const groupMap = Object.fromEntries(groups.map((group) => [group.type, group]));

  results.forEach((item) => {
    const group = groupMap[item.type];
    if (group) group.items.push(item);
  });

  return groups.filter((group) => group.items.length > 0);
}
