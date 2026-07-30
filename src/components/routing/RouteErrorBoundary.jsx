import { Component } from 'react';
import { Outlet } from 'react-router-dom';
import { reportError } from '../../utils/logger';
import { isChunkLoadError, recoverFromChunkError } from '../../utils/chunkRecovery';

function RouteErrorFallback({ onRetry }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-space-md bg-app-bg p-space-lg text-center">
      <h1 className="text-title font-semibold text-app-text">Algo salió mal</h1>
      <p className="max-w-sm text-body text-app-muted">
        Estamos trabajando para solucionarlo.
      </p>
      <div className="mt-space-sm flex flex-wrap items-center justify-center gap-space-sm">
        <button
          type="button"
          onClick={onRetry}
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

    if (isChunkLoadError(error) && recoverFromChunkError(error)) {
      return;
    }

    if (!this.state.autoRetried) {
      window.setTimeout(() => {
        this.setState({ hasError: false, autoRetried: true, error: null });
      }, 500);
    }
  }

  handleRetry = () => {
    if (isChunkLoadError(this.state.error) && recoverFromChunkError(this.state.error)) {
      return;
    }
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, autoRetried: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.autoRetried) {
      return <RouteErrorFallback onRetry={this.handleRetry} />;
    }

    if (this.state.hasError) {
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
