import {
  isNetworkLikeError,
  reportServerReachable,
  reportServerUnreachable,
} from './connectivity';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff.
 * On final network failure, marks connectivity as unreachable.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {{
 *   retries?: number,
 *   baseDelayMs?: number,
 *   maxDelayMs?: number,
 *   shouldRetry?: (error: unknown, attempt: number) => boolean,
 * }} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(operation, options = {}) {
  const {
    retries = 2,
    baseDelayMs = 400,
    maxDelayMs = 4000,
    shouldRetry = (error) => isNetworkLikeError(error),
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await operation();
      reportServerReachable();
      return result;
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && shouldRetry(error, attempt);
      if (!canRetry) break;
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delay);
    }
  }

  if (isNetworkLikeError(lastError)) {
    reportServerUnreachable();
  }

  throw lastError;
}

/**
 * React Query retryDelay helper (exponential).
 * @param {number} attemptIndex
 */
export function queryRetryDelay(attemptIndex) {
  return Math.min(500 * 2 ** attemptIndex, 8000);
}

/**
 * React Query retry predicate — skip retries for auth / validation style failures.
 */
export function shouldRetryQuery(failureCount, error) {
  if (failureCount >= 2) return false;
  const status = Number(error?.status || error?.statusCode || 0);
  if (status === 401 || status === 403 || status === 404 || status === 422) return false;
  return true;
}
