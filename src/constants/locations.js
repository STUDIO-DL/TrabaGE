/**
 * Central location catalog for TrabaGE.
 * Add a new country by appending one entry to LOCATION_DATA — no UI logic changes needed.
 */

export const DEFAULT_COUNTRY = 'Guinea Ecuatorial';

/**
 * Ordered country → cities map.
 * City spelling for Guinea Ecuatorial preserves existing DB values.
 */
export const LOCATION_DATA = [
  {
    country: 'Guinea Ecuatorial',
    cities: [
      'Malabo',
      'Bata',
      'Ebebiyín',
      'Mongomo',
      'Aconibe',
      'Añisoc',
      'Luba',
      'Evinayong',
      'Micomeseng',
      'Nsok',
      'Mbini',
      'Rebola',
      'Nkimi',
      'Riaba',
      'San Antonio de Palé',
    ],
  },
  {
    country: 'España',
    cities: [
      'Madrid',
      'Barcelona',
      'Valencia',
      'Sevilla',
      'Bilbao',
      'Málaga',
      'Zaragoza',
      'Murcia',
      'Las Palmas',
      'Palma',
    ],
  },
  {
    country: 'Camerún',
    cities: [
      'Douala',
      'Yaoundé',
      'Bamenda',
      'Bafoussam',
      'Garoua',
      'Maroua',
      'Ngaoundéré',
      'Limbe',
      'Buea',
      'Bertoua',
    ],
  },
  {
    country: 'Senegal',
    cities: [
      'Dakar',
      'Thiès',
      'Saint-Louis',
      'Kaolack',
      'Ziguinchor',
      'Touba',
      'Rufisque',
      'Tambacounda',
    ],
  },
  {
    country: 'Benín',
    cities: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey', 'Bohicon'],
  },
  {
    country: 'Ghana',
    cities: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Tema'],
  },
  {
    country: 'Nigeria',
    cities: [
      'Lagos',
      'Abuja',
      'Port Harcourt',
      'Ibadan',
      'Kano',
      'Enugu',
      'Benin City',
      'Jos',
      'Kaduna',
      'Calabar',
    ],
  },
  {
    country: 'Estados Unidos',
    cities: [
      'New York',
      'Los Angeles',
      'Houston',
      'Chicago',
      'Miami',
      'Dallas',
      'Atlanta',
      'Washington D.C.',
      'San Francisco',
      'Boston',
    ],
  },
];

/** Country names in display order (profile selectors). */
export const COUNTRIES = LOCATION_DATA.map((entry) => entry.country);

/** Map country → cities for O(1) lookups. */
export const CITIES_BY_COUNTRY = Object.fromEntries(
  LOCATION_DATA.map((entry) => [entry.country, entry.cities]),
);

/**
 * Equatorial Guinea cities — used by register, job filters, publish job, etc.
 * Kept as a stable export so existing GE-first flows keep working.
 */
export const CITIES = CITIES_BY_COUNTRY[DEFAULT_COUNTRY];

/** Flat unique city list across all countries (filters / fuzzy match). */
export const ALL_CITIES = Array.from(
  new Set(LOCATION_DATA.flatMap((entry) => entry.cities)),
);

/** Sentinel select value — never persisted as the city name. */
export const CITY_OTHER_VALUE = '__other__';
export const CITY_OTHER_LABEL = 'Otro';

export function getCitiesForCountry(country = '') {
  const key = String(country || '').trim();
  if (!key) return [];
  return CITIES_BY_COUNTRY[key] || [];
}

export function isKnownCountry(country = '') {
  return COUNTRIES.includes(String(country || '').trim());
}

/**
 * Whether a city belongs to a country's catalog.
 * Without country, checks the GE list (legacy callers / register).
 */
export function isListedCity(city = '', country = DEFAULT_COUNTRY) {
  const trimmed = String(city || '').trim();
  if (!trimmed) return false;
  const list = country ? getCitiesForCountry(country) : CITIES;
  if (list.length > 0) return list.includes(trimmed);
  return ALL_CITIES.includes(trimmed);
}

/**
 * Resolve the city <select> value from a stored city string.
 * Supports legacy `getCitySelectValue(city, forceOther)` and
 * `getCitySelectValue(city, country, forceOther)`.
 */
export function getCitySelectValue(city = '', countryOrForce = DEFAULT_COUNTRY, forceOther = false) {
  let country = DEFAULT_COUNTRY;
  let force = forceOther;
  if (typeof countryOrForce === 'boolean') {
    force = countryOrForce;
  } else if (countryOrForce != null && countryOrForce !== '') {
    country = countryOrForce;
  }

  const trimmed = String(city || '').trim();
  if (force || (trimmed && !isListedCity(trimmed, country))) return CITY_OTHER_VALUE;
  return trimmed;
}

export function getCityLabel(city) {
  return city;
}

/** Display helper: "Ciudad, País" */
export function formatCityCountry(city, country) {
  return [city, country].map((part) => String(part || '').trim()).filter(Boolean).join(', ');
}
