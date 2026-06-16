import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME } from '../../constants/roles';
import { getPreviewRole, isPreviewActive } from '../../constants/preview';

export default function RoleRoute({ role: requiredRole }) {
  const { role, setupComplete, isPreviewMode } = useAuth();
  const location = useLocation();
  const isSetupRoute = location.pathname.startsWith('/setup/');
  const previewActive = isPreviewActive(isPreviewMode);
  const effectiveRole = role ?? (previewActive ? getPreviewRole() : null);
  const effectiveSetupComplete =
    setupComplete || (previewActive && Boolean(getPreviewRole()));

  if (effectiveRole !== requiredRole) {
    if (requiredRole === 'admin') {
      return <Navigate to="/login" replace />;
    }
    const fallback = previewActive ? '/account-type' : '/login';
    return <Navigate to={ROLE_HOME[effectiveRole] || fallback} replace />;
  }

  if (!effectiveSetupComplete && !isSetupRoute && requiredRole !== 'admin' && !previewActive) {
    const setupPath = requiredRole === 'company' ? '/setup/company' : '/setup/candidate';
    return <Navigate to={setupPath} replace />;
  }

  return <Outlet />;
}
