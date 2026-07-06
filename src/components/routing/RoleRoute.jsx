import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME, ROLE_SETUP } from '../../constants/roles';
import { getPreviewRole, isPreviewActive } from '../../constants/preview';
import Spinner from '../ui/Spinner';

export default function RoleRoute({ role: requiredRole }) {
  const { role, isPreviewMode, loading, isAuthenticated, refreshAuthState, setupComplete } =
    useAuth();
  const location = useLocation();
  const previewActive = requiredRole === 'admin' ? false : isPreviewActive(isPreviewMode);
  const effectiveRole = role ?? (previewActive ? getPreviewRole() : null);

  useEffect(() => {
    if (previewActive || loading || !isAuthenticated || effectiveRole) return;
    void refreshAuthState();
  }, [previewActive, loading, isAuthenticated, effectiveRole, refreshAuthState]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!previewActive && isAuthenticated && !effectiveRole) {
    return <Navigate to="/register" replace state={{ fromOAuth: true }} />;
  }

  if (effectiveRole !== requiredRole) {
    if (requiredRole === 'admin') {
      return <Navigate to="/login" replace />;
    }
    const fallback = previewActive || isAuthenticated ? '/register' : '/login';
    return <Navigate to={ROLE_HOME[effectiveRole] || fallback} replace />;
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
