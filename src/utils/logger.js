import * as Sentry from '@sentry/react';

function normalizeError(error) {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  try {
    return new Error(JSON.stringify(error ?? 'Unknown error'));
  } catch {
    return new Error('Unknown error');
  }
}

export function reportError(error, context = {}) {
  const normalized = normalizeError(error);

  Sentry.captureException(normalized, {
    extra: context,
  });

  if (import.meta.env.DEV) {
    console.error('[TrabaGE]', context, normalized);
  }
}
