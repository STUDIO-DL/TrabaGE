/**
 * In-memory + sessionStorage cache for the home feed.
 * Survives tab switches / remounts within the same browser session.
 */

const MEMORY = new Map();
const STORAGE_PREFIX = 'trabage_feed_cache_v1_';
const MAX_AGE_MS = 15 * 60 * 1000;

function storageKey(cacheKey) {
  return `${STORAGE_PREFIX}${cacheKey}`;
}

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function buildFeedCacheKey({ userId, role, authorId }) {
  return [userId || 'guest', role || 'none', authorId || 'home'].join(':');
}

export function readFeedCache(cacheKey) {
  if (!cacheKey) return null;
  const mem = MEMORY.get(cacheKey);
  if (mem?.items?.length && Date.now() - mem.savedAt < MAX_AGE_MS) {
    return mem;
  }

  try {
    const parsed = safeParse(sessionStorage.getItem(storageKey(cacheKey)));
    if (!parsed?.items?.length) return null;
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(storageKey(cacheKey));
      return null;
    }
    MEMORY.set(cacheKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeFeedCache(cacheKey, { items, hasMore, offset }) {
  if (!cacheKey || !Array.isArray(items) || items.length === 0) return;
  const payload = {
    items,
    hasMore: Boolean(hasMore),
    offset: Number(offset) || 0,
    savedAt: Date.now(),
  };
  MEMORY.set(cacheKey, payload);
  try {
    sessionStorage.setItem(storageKey(cacheKey), JSON.stringify(payload));
  } catch {
    // Quota — memory cache still helps within the session.
  }
}

export function patchFeedCacheItems(cacheKey, updater) {
  const current = readFeedCache(cacheKey);
  if (!current) return;
  const nextItems = updater(current.items);
  if (!Array.isArray(nextItems)) return;
  writeFeedCache(cacheKey, {
    items: nextItems,
    hasMore: current.hasMore,
    offset: current.offset,
  });
}

export function clearFeedCache(cacheKey) {
  if (!cacheKey) return;
  MEMORY.delete(cacheKey);
  try {
    sessionStorage.removeItem(storageKey(cacheKey));
  } catch {
    // Ignore.
  }
}
