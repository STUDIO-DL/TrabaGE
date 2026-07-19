const STORAGE_KEY = 'trabage_search_history';
const MAX_ITEMS = 5;

function readHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string' && item.trim())
      : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function getSearchHistory() {
  return readHistory();
}

export function addSearchHistory(query) {
  const trimmed = query?.trim();
  if (!trimmed) return readHistory();

  const normalized = trimmed.toLowerCase();
  const existing = readHistory().filter((item) => item.toLowerCase() !== normalized);
  const next = [trimmed, ...existing].slice(0, MAX_ITEMS);
  writeHistory(next);
  return next;
}

export function removeSearchHistory(query) {
  const normalized = query?.trim()?.toLowerCase();
  if (!normalized) return readHistory();

  const next = readHistory().filter((item) => item.toLowerCase() !== normalized);
  writeHistory(next);
  return next;
}

export function clearSearchHistory() {
  writeHistory([]);
  return [];
}
