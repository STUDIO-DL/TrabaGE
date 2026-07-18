/**
 * Returns a safe https URL for use in href attributes, or null if invalid.
 */
export function safeExternalUrl(raw) {
  if (!raw) return null;

  try {
    const url = new URL(String(raw).trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Normalizes user input to https and validates the result.
 */
export function normalizeHttpsUrl(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return safeExternalUrl(withScheme);
}
