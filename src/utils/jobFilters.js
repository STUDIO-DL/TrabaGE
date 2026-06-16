import { CITIES } from '../constants/cities';

export function matchCityFromQuery(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;

  return CITIES.find(
    (city) =>
      city.toLowerCase() === normalized ||
      city.toLowerCase().includes(normalized) ||
      normalized.includes(city.toLowerCase()),
  );
}

export function buildJobFilters(filters = {}, query = '') {
  const next = { ...filters };
  if (!next.city) {
    const matchedCity = matchCityFromQuery(query);
    if (matchedCity) next.city = matchedCity;
  }
  return next;
}
