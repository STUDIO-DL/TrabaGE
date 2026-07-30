import { INSTITUTION_TYPE_LABELS } from '../data/institutions';
import { EMPLOYERS } from '../data/employers';
import { INSTITUTIONS } from '../data/institutions';
import {
  formatCatalogDisplayName,
  normalizeCatalogSearchText,
  searchCatalog,
} from './catalogSearch';
import { searchInstitutions } from './searchInstitutions';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   organizationType: 'education'|'company'|'organization',
 *   subtitle?: string,
 *   type?: string,
 *   short_name?: string,
 *   acronym?: string,
 *   aliases?: string[],
 *   provider?: string,
 * }} CatalogOrganization
 */

/**
 * Educational institutions as organization records (education selector).
 * @returns {CatalogOrganization[]}
 */
export function getEducationOrganizations() {
  return INSTITUTIONS.map((institution) => ({
    id: institution.id,
    name: institution.name,
    organizationType: 'education',
    type: institution.type,
    short_name: institution.short_name,
    acronym: institution.acronym,
    aliases: institution.aliases,
    provider: institution.provider,
    subtitle: [institution.city, institution.country].filter(Boolean).join(' • '),
  }));
}

/**
 * Employers for work experience: companies + orgs + education centers.
 * @returns {CatalogOrganization[]}
 */
export function getExperienceOrganizations() {
  const employers = EMPLOYERS.map((employer) => ({
    id: employer.id,
    name: employer.name,
    organizationType: employer.organizationType,
    short_name: employer.short_name,
    acronym: employer.acronym,
    aliases: employer.aliases,
    provider: employer.provider,
    subtitle:
      employer.organizationType === 'organization' ? 'Organización' : 'Empresa',
  }));

  const education = getEducationOrganizations();
  return [...employers, ...education];
}

/**
 * Local organization name search — empty query returns [].
 * Matches name, short_name, acronym, aliases, provider, subtitle.
 *
 * @param {string} query
 * @param {CatalogOrganization[]} organizations
 * @param {{ limit?: number }} [options]
 * @returns {CatalogOrganization[]}
 */
export function searchOrganizations(query, organizations, { limit = 8 } = {}) {
  return searchCatalog(query, organizations, {
    limit,
    haystackExtra: (organization) => {
      const typeLabel = organization.type
        ? INSTITUTION_TYPE_LABELS[organization.type] || organization.type
        : organization.organizationType || '';
      return [typeLabel];
    },
  });
}

/**
 * Convenience: search education catalog only.
 */
export function searchEducationOrganizations(query, { limit = 8 } = {}) {
  return searchOrganizations(query, getEducationOrganizations(), { limit });
}

/**
 * Convenience: search experience catalog (company + organization + education).
 */
export function searchExperienceOrganizations(query, { limit = 8 } = {}) {
  return searchOrganizations(query, getExperienceOrganizations(), { limit });
}

export {
  searchInstitutions,
  normalizeCatalogSearchText,
  normalizeCatalogSearchText as normalizeInstitutionSearchText,
  formatCatalogDisplayName,
};
