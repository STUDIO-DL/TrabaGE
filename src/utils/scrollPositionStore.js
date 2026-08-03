const SCROLL_PREFIX = 'trabage_scroll_';
const MAX_ENTRIES = 40;

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readAll() {
  const parsed = safeParse(localStorage.getItem(SCROLL_PREFIX + 'index'));
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function writeAll(map) {
  try {
    const entries = Object.entries(map);
    if (entries.length > MAX_ENTRIES) {
      entries
        .sort((a, b) => (a[1]?.savedAt ?? 0) - (b[1]?.savedAt ?? 0))
        .slice(0, entries.length - MAX_ENTRIES)
        .forEach(([key]) => {
          delete map[key];
        });
    }
    localStorage.setItem(SCROLL_PREFIX + 'index', JSON.stringify(map));
  } catch {
    // Quota / private mode.
  }
}

export function saveScrollPosition(path, y) {
  if (!path) return;
  const map = readAll();
  map[path] = { y: Math.max(0, Number(y) || 0), savedAt: Date.now() };
  writeAll(map);
}

export function loadScrollPosition(path) {
  if (!path) return null;
  const entry = readAll()[path];
  if (!entry || typeof entry.y !== 'number') return null;
  return entry.y;
}

export function clearScrollPositions() {
  try {
    localStorage.removeItem(SCROLL_PREFIX + 'index');
  } catch {
    // Ignore.
  }
}
