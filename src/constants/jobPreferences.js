export const EMPTY_JOB_PREFERENCES = {
  preferred_cities: [],
  preferred_job_types: [],
  preferred_sectors: [],
  keywords: [],
};

export function normalizeJobPreferences(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_JOB_PREFERENCES };

  return {
    preferred_cities: Array.isArray(raw.preferred_cities)
      ? raw.preferred_cities.filter(Boolean)
      : [],
    preferred_job_types: Array.isArray(raw.preferred_job_types)
      ? raw.preferred_job_types.filter(Boolean)
      : [],
    preferred_sectors: Array.isArray(raw.preferred_sectors)
      ? raw.preferred_sectors.filter(Boolean)
      : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter(Boolean) : [],
  };
}

export function hasJobPreferences(raw) {
  const prefs = normalizeJobPreferences(raw);
  return (
    prefs.preferred_cities.length > 0 ||
    prefs.preferred_job_types.length > 0 ||
    prefs.preferred_sectors.length > 0 ||
    prefs.keywords.length > 0
  );
}
