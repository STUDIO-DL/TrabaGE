import * as Sentry from '@sentry/react';
import { readViteEnv } from './env';

export const initSentry = () => {
  const dsn = readViteEnv(import.meta.env.VITE_SENTRY_DSN);
  if (!dsn) return;

  const isProd = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE) === 'production';

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
    tracesSampleRate: isProd ? 0.1 : 0.2,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true }),
    ],
    replaysSessionSampleRate: isProd ? 0.02 : 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
};

export const setSentryUser = (user) => {
  if (!user) return;
  Sentry.setUser({ id: user.id });
};

export const clearSentryUser = () => {
  Sentry.setUser(null);
};
