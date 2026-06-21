const INTERNAL_ERROR_PATTERNS = [
  /cannot coerce.*single json object/i,
  /json object requested.*multiple \(or no\) rows/i,
  /column reference "user_id" is ambiguous/i,
];

export function getSupabaseErrorMessage(error, fallback = 'No se pudo guardar. Intentalo de nuevo.') {
  const message = error?.message || '';

  if (!message) return fallback;

  if (INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  return message;
}
