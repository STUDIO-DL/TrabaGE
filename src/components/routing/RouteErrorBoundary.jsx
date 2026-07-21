import { Component } from 'react';
import { Outlet } from 'react-router-dom';
import { reportError } from '../../utils/logger';
import { isChunkLoadError, recoverFromChunkError } from '../../utils/chunkRecovery';

function RouteErrorFallback({ onRetry }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-space-md bg-app-bg p-space-lg text-center">
      <p className="max-w-sm text-body text-app-text">
        No se puede cargar esta sección. Puedes reintentar.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-radius-md bg-primary-600 px-space-lg py-space-sm text-label font-medium text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
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

    // Stale deploy / PWA shell: one automatic hard reload.
    if (isChunkLoadError(error) && recoverFromChunkError(error)) {
      return;
    }

    // One soft auto-retry for transient network glitches during navigation.
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
      // Quiet wait during the single auto-retry / chunk-reload window.
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
