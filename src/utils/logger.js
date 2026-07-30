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

  // Strip obvious secrets from context before shipping to Sentry
  const safeContext = { ...context };
  delete safeContext.password;
  delete safeContext.token;
  delete safeContext.accessToken;
  delete safeContext.refreshToken;
  delete safeContext.authorization;

  Sentry.captureException(normalized, {
    extra: safeContext,
    tags: {
      errorId: context.errorId || undefined,
      errorType: context.errorType || undefined,
      area: context.area || undefined,
    },
  });

  if (import.meta.env.DEV) {
    console.error('[TrabaGE]', safeContext, normalized);
  }
}
