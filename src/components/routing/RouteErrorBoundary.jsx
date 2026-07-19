import { Component } from 'react';
import { Outlet } from 'react-router-dom';
import { reportError } from '../../utils/logger';
import { formatAuthErrorDetail } from '../../utils/errors';

function RouteErrorFallback({ onRetry, error }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Error de ruta</h1>
      <p className="mt-2 text-sm text-gray-500">
        Ha ocurrido un error inesperado al cargar esta sección. Puedes reintentar.
      </p>
      {error ? (
        <pre className="mt-4 max-h-64 w-full max-w-xl overflow-auto rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800 whitespace-pre-wrap">
          {formatAuthErrorDetail(error)}
        </pre>
      ) : null}
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, autoRetried: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    reportError(error, { area: 'route_error_boundary', componentStack: info?.componentStack });

    // One silent auto-retry for transient chunk/network glitches during navigation.
    if (!this.state.autoRetried) {
      window.setTimeout(() => {
        this.setState({ hasError: false, autoRetried: true });
      }, 500);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, autoRetried: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.autoRetried) {
      return <RouteErrorFallback onRetry={this.handleRetry} error={this.state.error} />;
    }

    if (this.state.hasError) {
      // Quiet wait during the single auto-retry window.
      return (
        <div
          className="flex min-h-dvh items-center justify-center bg-app-bg"
          aria-busy="true"
          aria-label="Cargando"
        />
      );
    }

    return this.props.children;
  }
}

export function RouteSectionLayout() {
  return (
    <RouteErrorBoundary>
      <Outlet />
    </RouteErrorBoundary>
  );
}
