import { INSTITUTION_TYPE_LABELS } from '../data/institutions';

/**
 * Accent-insensitive, case-insensitive normalization for institution search.
 * QA: partial search, multi-word, case, accents — all handled via this helper.
 */
export function normalizeInstitutionSearchText(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Build a searchable haystack for an institution record.
 * @param {import('../data/institutions').Institution} institution
 */
export function institutionSearchHaystack(institution) {
  const typeLabel = INSTITUTION_TYPE_LABELS[institution.type] || '';
  return normalizeInstitutionSearchText(
    [institution.name, institution.city, institution.country, typeLabel].join(' '),
  );
}

/**
 * Local institution search — no network, memo-friendly pure function.
 *
 * Supports:
 * - partial match (substring)
 * - multi-word AND (each token must appear somewhere in haystack)
 * - case insensitive
 * - accent insensitive (NFD)
 *
 * @param {string} query
 * @param {import('../data/institutions').Institution[]} institutions
 * @param {{ limit?: number }} [options]
 * @returns {import('../data/institutions').Institution[]}
 */
export function searchInstitutions(query, institutions, { limit = 8 } = {}) {
  if (!institutions?.length) return [];

  const normalizedQuery = normalizeInstitutionSearchText(query);
  if (!normalizedQuery) return institutions.slice(0, limit);

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return institutions
    .filter((institution) => {
      const haystack = institutionSearchHaystack(institution);
      return tokens.every((token) => haystack.includes(token));
    })
    .slice(0, limit);
}
