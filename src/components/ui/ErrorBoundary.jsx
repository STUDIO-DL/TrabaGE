import * as Sentry from '@sentry/react';

function Fallback({ error, resetError }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Algo salió mal</h1>
      <p className="mt-2 text-sm text-gray-500">{error?.message}</p>
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
