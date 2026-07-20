import { CITIES } from '../constants/cities';

const MIN_CITY_QUERY_LEN = 3;

/**
 * Match a city only on exact equality or a clear prefix (min 3 chars).
 * Avoids turning short title substrings (e.g. "ma", "ba") into hard city filters.
 */
export function matchCityFromQuery(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;

  const exact = CITIES.find((city) => city.toLowerCase() === normalized);
  if (exact) return exact;

  if (normalized.length < MIN_CITY_QUERY_LEN) return undefined;

  return CITIES.find((city) => city.toLowerCase().startsWith(normalized));
}

export function buildJobFilters(filters = {}, query = '') {
  const next = { ...filters };
  if (!next.city) {
    const matchedCity = matchCityFromQuery(query);
    if (matchedCity) next.city = matchedCity;
  }
  return next;
}
