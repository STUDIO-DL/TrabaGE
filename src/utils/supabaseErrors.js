import { getUserErrorMessage } from './userFacingError';

/**
 * Backward-compatible API used across admin and product UI.
 * Always returns a human Spanish message — never raw PostgREST/storage text.
 *
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function getSupabaseErrorMessage(error, fallback) {
  return getUserErrorMessage(error, {
    fallback: fallback || undefined,
    action: fallback ? undefined : 'generic',
  });
}
