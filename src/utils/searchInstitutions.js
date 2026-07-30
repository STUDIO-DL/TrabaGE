import { INSTITUTION_TYPE_LABELS } from '../data/institutions';
import {
  catalogSearchHaystack,
  formatCatalogDisplayName,
  normalizeCatalogSearchText,
  searchCatalog,
} from './catalogSearch';

export {
  formatCatalogDisplayName,
  normalizeCatalogSearchText,
  normalizeCatalogSearchText as normalizeInstitutionSearchText,
};

/**
 * Build a searchable haystack for an institution record.
 * @param {import('../data/institutions').Institution} institution
 */
export function institutionSearchHaystack(institution) {
  const typeLabel = INSTITUTION_TYPE_LABELS[institution.type] || '';
  return catalogSearchHaystack({ ...institution, typeLabel });
}

/**
 * Local institution search — no network, memo-friendly pure function.
 *
 * Matches official name, short_name, acronym, aliases, provider, city, country, type.
 * Ignores case, accents, acronym dots, and extra whitespace.
 *
 * @param {string} query
 * @param {import('../data/institutions').Institution[]} institutions
 * @param {{ limit?: number }} [options]
 * @returns {import('../data/institutions').Institution[]}
 */
export function searchInstitutions(query, institutions, { limit = 8 } = {}) {
  return searchCatalog(query, institutions, {
    limit,
    haystackExtra: (institution) => [INSTITUTION_TYPE_LABELS[institution.type] || ''],
  });
}
