import * as Sentry from '@sentry/react';
import { formatAuthErrorDetail } from '../../utils/errors';

function Fallback({ error, resetError }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Error de renderizado</h1>
      <p className="mt-2 text-sm text-gray-500">
        Ha ocurrido un error inesperado en la interfaz. Puedes reintentar.
      </p>
      {error ? (
        <pre className="mt-4 max-h-64 w-full max-w-xl overflow-auto rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800 whitespace-pre-wrap">
          {formatAuthErrorDetail(error)}
        </pre>
      ) : null}
      <button
        type="button"
        onClick={resetError}
        className="mt-6 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white"
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
    <ErrorBoundary fallback={Fallback} showDialog={false}>
      {children}
    </ErrorBoundary>
  );
}
