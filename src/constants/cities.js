export const CITIES = [
  'Malabo',
  'Bata',
  'Ebebiyín',
  'Mongomo',
  'Evinayong',
  'Luba',
  'Mbini',
  'Micomeseng',
  'Rebola',
  'Aconibe',
  'Añisoc',
  'Nsok',
  'Nkimi',
  'Riaba',
  'San Antonio de Palé',
];

/** Sentinel select value — never persisted as the city name. */
export const CITY_OTHER_VALUE = '__other__';
export const CITY_OTHER_LABEL = 'Otro';

export const getCityLabel = (city) => city;

export function isListedCity(city = '') {
  return CITIES.includes(String(city).trim());
}

/**
 * Resolve the city <select> value from a stored city string.
 * @param {string} city
 * @param {boolean} [forceOther]
 */
export function getCitySelectValue(city = '', forceOther = false) {
  const trimmed = String(city).trim();
  if (forceOther || (trimmed && !isListedCity(trimmed))) return CITY_OTHER_VALUE;
  return trimmed;
}
