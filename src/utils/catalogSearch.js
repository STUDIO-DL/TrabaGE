/**
 * Shared catalog search for institutions, employers, and organizations.
 * Matches against official name, short_name, acronym, aliases, and provider.
 * Ignores case, accents, acronym dots, and extra whitespace.
 */

/**
 * @typedef {Object} CatalogSearchFields
 * @property {string} [id]
 * @property {string} name
 * @property {string} [short_name]
 * @property {string} [acronym]
 * @property {string[]} [aliases]
 * @property {string} [provider]
 * @property {string} [city]
 * @property {string} [country]
 * @property {string} [subtitle]
 * @property {string} [typeLabel]
 */

/**
 * Normalize text for catalog matching.
 * Strips accents, lowercases, removes dots (U.N.G.E. → unge), collapses noise.
 */
export function normalizeCatalogSearchText(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[.\u00B7·]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @deprecated Prefer normalizeCatalogSearchText — kept for existing imports */
export const normalizeInstitutionSearchText = normalizeCatalogSearchText;

/**
 * Build dotted abbreviation from an acronym (UNGE → U.N.G.E.).
 * @param {string} acronym
 */
export function dottedAcronym(acronym = '') {
  const letters = String(acronym)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9]/g, '');
  if (letters.length < 2) return '';
  return `${[...letters].join('.').toUpperCase()}.`;
}

/**
 * Detect parenthetical acronyms like "(ITGE)", "(CEM)", "(APSI GE)".
 * Ignores descriptive parentheses ("Universidad Complutense de Madrid", "en alianza…").
 * @param {string} name
 * @returns {string|null}
 */
export function extractAcronymFromName(name = '') {
  const match = String(name).match(/\(([^)]+)\)\s*$/);
  if (!match) return null;

  const inner = match[1].trim();
  if (!looksLikeAcronym(inner)) return null;
  return inner.replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} text
 */
function looksLikeAcronym(text) {
  const compact = text.replace(/[.\s&/-]/g, '');
  if (compact.length < 2 || compact.length > 12) return false;

  const letters = compact.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9]/g, '');
  if (letters.length < 2) return false;

  const upperCount = [...letters].filter((ch) => ch === ch.toUpperCase() && /[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/.test(ch)).length;
  const letterCount = [...letters].filter((ch) => /[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/.test(ch)).length;
  if (letterCount === 0) return false;
  return upperCount / letterCount >= 0.7;
}

/**
 * Unique non-empty strings, preserving order.
 * @param {(string|null|undefined)[]} values
 */
export function uniqueCatalogTerms(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) continue;
    const key = normalizeCatalogSearchText(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * Merge base catalog row with curated meta + auto-extracted acronym/aliases.
 * One institution record; many search values — never duplicates rows.
 *
 * @param {object} entry
 * @param {CatalogSearchFields} [meta]
 */
export function enrichCatalogEntry(entry, meta = {}) {
  if (!entry) return entry;

  const fromName = extractAcronymFromName(entry.name);
  const acronym = (meta.acronym || entry.acronym || fromName || '').trim() || undefined;
  const short_name = (meta.short_name || entry.short_name || '').trim() || undefined;
  const provider = (meta.provider || entry.provider || '').trim() || undefined;

  const aliases = uniqueCatalogTerms([
    ...(Array.isArray(entry.aliases) ? entry.aliases : []),
    ...(Array.isArray(meta.aliases) ? meta.aliases : []),
    acronym ? dottedAcronym(acronym) : null,
    fromName && fromName !== acronym ? fromName : null,
    fromName ? dottedAcronym(fromName) : null,
  ]);

  return {
    ...entry,
    ...(short_name ? { short_name } : {}),
    ...(acronym ? { acronym } : {}),
    ...(provider ? { provider } : {}),
    ...(aliases.length ? { aliases } : {}),
  };
}

/**
 * Display label: "Universidad Nacional de Guinea Ecuatorial (UNGE)".
 * Does not alter the saved official `name`.
 * @param {{ name?: string, acronym?: string }} entry
 */
export function formatCatalogDisplayName(entry) {
  const name = entry?.name?.trim() || '';
  const acronym = entry?.acronym?.trim();
  if (!name) return '';
  if (!acronym) return name;

  const normalizedName = normalizeCatalogSearchText(name);
  const normalizedAcronym = normalizeCatalogSearchText(acronym);
  if (normalizedName.includes(normalizedAcronym)) return name;
  return `${name} (${acronym})`;
}

/**
 * Searchable haystack for a catalog row.
 * @param {CatalogSearchFields} entry
 * @param {string[]} [extra]
 */
export function catalogSearchHaystack(entry, extra = []) {
  const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
  return normalizeCatalogSearchText(
    [
      entry.name,
      entry.short_name,
      entry.acronym,
      entry.provider,
      ...aliases,
      entry.city,
      entry.country,
      entry.subtitle,
      entry.typeLabel,
      ...extra,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/**
 * Rank matches so exact acronym / short name beats weak substring hits.
 * @param {CatalogSearchFields} entry
 * @param {string[]} tokens
 * @param {string} normalizedQuery
 */
export function scoreCatalogMatch(entry, tokens, normalizedQuery) {
  const acronym = normalizeCatalogSearchText(entry.acronym || '');
  const shortName = normalizeCatalogSearchText(entry.short_name || '');
  const name = normalizeCatalogSearchText(entry.name || '');
  const aliases = (entry.aliases || []).map((alias) => normalizeCatalogSearchText(alias));

  let score = 0;

  if (acronym && (normalizedQuery === acronym || (tokens.length === 1 && tokens[0] === acronym))) {
    score += 120;
  } else if (acronym && tokens.some((token) => token === acronym)) {
    score += 90;
  } else if (acronym && tokens.some((token) => acronym.startsWith(token) && token.length >= 2)) {
    score += 70;
  }

  if (shortName && (normalizedQuery === shortName || shortName.startsWith(normalizedQuery))) {
    score += 80;
  }

  if (name === normalizedQuery) score += 100;
  else if (name.startsWith(normalizedQuery)) score += 60;
  else if (tokens.every((token) => name.includes(token))) score += 40;

  if (aliases.some((alias) => alias === normalizedQuery || tokens.every((t) => alias.includes(t)))) {
    score += 50;
  }

  // Prefer shorter official names when scores tie (main UNGE over "… de la UNGE")
  score += Math.max(0, 30 - Math.min(30, Math.floor(name.length / 8)));

  return score;
}

/**
 * Generic catalog search with multi-token AND matching + ranking.
 *
 * @template T
 * @param {string} query
 * @param {T[]} items
 * @param {{ limit?: number, haystackExtra?: (item: T) => string[] }} [options]
 * @returns {T[]}
 */
export function searchCatalog(query, items, { limit = 8, haystackExtra } = {}) {
  if (!items?.length) return [];

  const normalizedQuery = normalizeCatalogSearchText(query);
  if (!normalizedQuery) return [];

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return items
    .map((item) => {
      const extra = haystackExtra?.(item) || [];
      const haystack = catalogSearchHaystack(item, extra);
      if (!tokens.every((token) => haystack.includes(token))) return null;
      return { item, score: scoreCatalogMatch(item, tokens, normalizedQuery) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'es'))
    .slice(0, limit)
    .map((row) => row.item);
}
