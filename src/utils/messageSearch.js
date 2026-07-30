/**
 * Accent/case-insensitive helpers for messaging search UI (highlight + compare).
 */

export function normalizeMessageSearchText(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Split text into segments for subtle highlight rendering.
 * Uses accent-stripped lowercase matching mapped back by character walk.
 * @returns {{ text: string, match: boolean }[]}
 */
export function splitSearchHighlight(text = '', query = '') {
  const source = String(text ?? '');
  const q = normalizeMessageSearchText(query);
  if (!source || !q) return [{ text: source, match: false }];

  // Parallel arrays: each original char → its normalized form (may be multi-char for rare cases)
  const units = [];
  for (let i = 0; i < source.length; i += 1) {
    const norm = source[i]
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
    units.push({ orig: source[i], norm: norm || source[i].toLowerCase() });
  }

  const haystack = units.map((u) => u.norm).join('');
  const parts = [];
  let i = 0;

  while (i < haystack.length) {
    const at = haystack.indexOf(q, i);
    if (at === -1) {
      parts.push({
        text: units
          .slice(normIndexToUnit(units, i))
          .map((u) => u.orig)
          .join(''),
        match: false,
      });
      break;
    }

    const startUnit = normIndexToUnit(units, at);
    const endUnit = normIndexToUnit(units, at + q.length);

    if (at > i) {
      parts.push({
        text: units
          .slice(normIndexToUnit(units, i), startUnit)
          .map((u) => u.orig)
          .join(''),
        match: false,
      });
    }

    parts.push({
      text: units.slice(startUnit, endUnit).map((u) => u.orig).join(''),
      match: true,
    });

    i = at + q.length;
  }

  return parts.filter((part) => part.text.length > 0);
}

function normIndexToUnit(units, normIndex) {
  let pos = 0;
  for (let i = 0; i < units.length; i += 1) {
    if (pos >= normIndex) return i;
    pos += units[i].norm.length;
  }
  return units.length;
}

export function formatMessageSearchTime(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('es', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
