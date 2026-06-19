export const EMPTY_JOB_PREFERENCES = {
  preferred_cities: [],
  preferred_locations: [],
  preferred_job_types: [],
  preferred_sectors: [],
  preferred_categories: [],
  keywords: [],
  experience_level: null,
  availability: null,
};

export function normalizeJobPreferences(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_JOB_PREFERENCES };

  const preferredCities = Array.isArray(raw.preferred_cities)
    ? raw.preferred_cities.filter(Boolean)
    : [];
  const preferredLocations = Array.isArray(raw.preferred_locations)
    ? raw.preferred_locations.filter(Boolean)
    : preferredCities;

  const preferredSectors = Array.isArray(raw.preferred_sectors)
    ? raw.preferred_sectors.filter(Boolean)
    : [];
  const preferredCategories = Array.isArray(raw.preferred_categories)
    ? raw.preferred_categories.filter(Boolean)
    : preferredSectors;

  return {
    preferred_cities: preferredLocations,
    preferred_locations: preferredLocations,
    preferred_job_types: Array.isArray(raw.preferred_job_types)
      ? raw.preferred_job_types.filter(Boolean)
      : [],
    preferred_sectors: preferredCategories,
    preferred_categories: preferredCategories,
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter(Boolean) : [],
    experience_level: raw.experience_level || null,
    availability: raw.availability || null,
  };
}

export function hasJobPreferences(raw) {
  const prefs = normalizeJobPreferences(raw);
  return (
    prefs.preferred_locations.length > 0 ||
    prefs.preferred_job_types.length > 0 ||
    prefs.preferred_categories.length > 0 ||
    prefs.keywords.length > 0 ||
    Boolean(prefs.experience_level) ||
    Boolean(prefs.availability)
  );
}

export function serializeJobPreferences(prefs) {
  const normalized = normalizeJobPreferences(prefs);
  return {
    preferred_locations: normalized.preferred_locations,
    preferred_cities: normalized.preferred_locations,
    preferred_categories: normalized.preferred_categories,
    preferred_sectors: normalized.preferred_categories,
    preferred_job_types: normalized.preferred_job_types,
    keywords: normalized.keywords,
    experience_level: normalized.experience_level,
    availability: normalized.availability,
  };
}
