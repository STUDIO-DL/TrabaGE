import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME } from '../../constants/roles';
import { getPreviewRole, isPreviewActive } from '../../constants/preview';

export default function RoleRoute({ role: requiredRole }) {
  const { role, isPreviewMode } = useAuth();
  const previewActive = isPreviewActive(isPreviewMode);
  const effectiveRole = role ?? (previewActive ? getPreviewRole() : null);

  if (effectiveRole !== requiredRole) {
    if (requiredRole === 'admin') {
      return <Navigate to="/login" replace />;
    }
    const fallback = previewActive ? '/account-type' : '/login';
    return <Navigate to={ROLE_HOME[effectiveRole] || fallback} replace />;
  }

  // Profile setup is optional. Setup routes (e.g. /setup/candidate) stay reachable
  // for the matching role, but we no longer force setup-incomplete users into them.
  return <Outlet />;
}
