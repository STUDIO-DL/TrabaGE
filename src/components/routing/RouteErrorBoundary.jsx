import { Component } from 'react';
import { Outlet } from 'react-router-dom';
import { reportError } from '../../utils/logger';

function RouteErrorFallback({ onRetry }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Algo salió mal</h1>
      <p className="mt-2 text-sm text-gray-500">
        No pudimos cargar esta pantalla. Inténtalo de nuevo en unos segundos.
      </p>
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
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, { area: 'route_error_boundary', componentStack: info?.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <RouteErrorFallback onRetry={this.handleRetry} />;
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
