import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME } from '../../constants/roles';
import { getPreviewRole, isPreviewActive } from '../../constants/preview';
import Spinner from '../ui/Spinner';

export default function RoleRoute({ role: requiredRole }) {
  const { role, isPreviewMode, loading, isAuthenticated, refreshAuthState } = useAuth();
  const previewActive = isPreviewActive(isPreviewMode);
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
    return <Navigate to="/account-type" replace state={{ fromOAuth: true }} />;
  }

  if (effectiveRole !== requiredRole) {
    if (requiredRole === 'admin') {
      return <Navigate to="/login" replace />;
    }
    const fallback = previewActive || isAuthenticated ? '/account-type' : '/login';
    return <Navigate to={ROLE_HOME[effectiveRole] || fallback} replace />;
  }

  // Profile setup is optional. Setup routes (e.g. /setup/candidate) stay reachable
  // for the matching role, but we no longer force setup-incomplete users into them.
  return <Outlet />;
}
