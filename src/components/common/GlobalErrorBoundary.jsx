import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';
import { reportError } from '../../utils/logger';

function ErrorFallback({ resetErrorBoundary }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500" />
      <h1 className="mt-4 text-2xl font-bold text-slate-800">Algo no ha funcionado bien</h1>
      <p className="mt-2 max-w-md text-slate-600">
        Lo sentimos, la aplicación ha encontrado un problema inesperado. Puedes intentar recargar la página o volver al inicio.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <RotateCw className="h-4 w-4" />
          <span>Reintentar</span>
        </button>
        <a
          href="/"
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          <Home className="h-4 w-4" />
          <span>Volver al inicio</span>
        </a>
      </div>
    </div>
  );
}

export default function GlobalErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => reportError(error, { area: 'global_error_boundary' })}
    >
      {children}
    </ErrorBoundary>
  );
}