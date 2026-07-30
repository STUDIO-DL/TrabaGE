import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { isChunkLoadError, recoverFromChunkError } from '../../utils/chunkRecovery';
import { reportError } from '../../utils/logger';

function Fallback({ error, resetError }) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      recoverFromChunkError(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-space-md bg-app-bg p-space-lg text-center">
      <h1 className="text-title font-semibold text-app-text">Algo salió mal</h1>
      <p className="max-w-sm text-body text-app-muted">
        Estamos trabajando para solucionarlo.
      </p>
      <div className="mt-space-sm flex flex-wrap items-center justify-center gap-space-sm">
        <button
          type="button"
          onClick={() => {
            if (isChunkLoadError(error) && recoverFromChunkError(error)) return;
            resetError();
          }}
          className="rounded-radius-md bg-primary-600 px-space-lg py-space-sm text-label font-medium text-white transition hover:bg-primary-700"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="rounded-radius-md border border-app-border bg-app-card px-space-lg py-space-sm text-label font-medium text-app-text transition hover:bg-app-surface"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

export const ErrorBoundary = Sentry.ErrorBoundary;
export default ErrorBoundary;

export function AppErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={Fallback}
      showDialog={false}
      onError={(error, componentStack) => {
        reportError(error, { area: 'app_error_boundary', componentStack });
        recoverFromChunkError(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
