const STOP_WORDS = new Set([
  'para', 'con', 'del', 'los', 'las', 'una', 'uno', 'por', 'que',
  'the', 'and', 'de', 'en', 'el', 'la', 'the', 'job', 'work',
]);

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9áéíóúñ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function uniqueTokens(tokens) {
  return [...new Set(tokens)];
}

export { STOP_WORDS };
