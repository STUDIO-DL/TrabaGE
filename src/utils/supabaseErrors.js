import { getErrorMessage } from './i18n';

const INTERNAL_ERROR_PATTERNS = [
  /cannot coerce.*single json object/i,
  /json object requested.*multiple \(or no\) rows/i,
  /column reference "user_id" is ambiguous/i,
  /violates row-level security/i,
  /permission denied/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /function .* does not exist/i,
  /check constraint/i,
  /foreign key constraint/i,
  /duplicate key/i,
  /invalid input syntax/i,
  /bucket/i,
  /storage/i,
  /jwt/i,
];

export function getSupabaseErrorMessage(error, fallback = getErrorMessage('supabaseFallback')) {
  const message = error?.message || '';

  if (!message) return fallback;

  if (INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  return message;
}
