import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME, ROLE_SETUP } from '../../constants/roles';
import { getPreviewRole, isPreviewActive } from '../../constants/preview';
import Spinner from '../ui/Spinner';

const ROLE_RESOLVE_TIMEOUT_MS = 4000;

export default function RoleRoute({ role: requiredRole }) {
  const { role, isPreviewMode, loading, isAuthenticated, refreshAuthState, setupComplete } =
    useAuth();
  const location = useLocation();
  const previewActive = requiredRole === 'admin' ? false : isPreviewActive(isPreviewMode);
  const effectiveRole = role ?? (previewActive ? getPreviewRole() : null);
  const [roleWaitExpired, setRoleWaitExpired] = useState(false);

  useEffect(() => {
    if (previewActive || loading || !isAuthenticated || effectiveRole) return;
    void refreshAuthState();
  }, [previewActive, loading, isAuthenticated, effectiveRole, refreshAuthState]);

  useEffect(() => {
    if (previewActive || loading || !isAuthenticated || effectiveRole) {
      setRoleWaitExpired(false);
      return undefined;
    }
    const timer = setTimeout(() => setRoleWaitExpired(true), ROLE_RESOLVE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [previewActive, loading, isAuthenticated, effectiveRole]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Keep a quiet loader while role hydrates — never flash /register mid-login.
  if (!previewActive && isAuthenticated && !effectiveRole) {
    if (!roleWaitExpired) {
      return (
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner size="lg" />
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  if (effectiveRole !== requiredRole) {
    if (requiredRole === 'admin') {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={ROLE_HOME[effectiveRole] || '/login'} replace />;
  }

  // Gate users whose required profile data is incomplete into the setup
  // assistant, so new Google/manual users are guided to finish before using the
  // app. The setup route itself stays reachable to avoid a redirect loop, and
  // preview/admin users are never gated.
  const setupPath = ROLE_SETUP[requiredRole];
  const onSetupPath = location.pathname.startsWith('/setup/');
  if (!previewActive && setupPath && !setupComplete && !onSetupPath) {
    return <Navigate to={setupPath} replace />;
  }

  return <Outlet />;
}
