import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { isChunkLoadError, recoverFromChunkError } from '../../utils/chunkRecovery';

function Fallback({ error, resetError }) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      recoverFromChunkError(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-space-md bg-app-bg p-space-lg text-center">
      <p className="max-w-sm text-body text-app-text">
        No se puede cargar esta sección. Puedes reintentar.
      </p>
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
      onError={(error) => {
        recoverFromChunkError(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
