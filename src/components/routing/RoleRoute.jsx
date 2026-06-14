import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME } from '../../constants/roles';

export default function RoleRoute({ role: requiredRole }) {
  const { role, setupComplete } = useAuth();
  const location = useLocation();
  const isSetupRoute = location.pathname.startsWith('/setup/');

  if (role !== requiredRole) {
    return <Navigate to={ROLE_HOME[role] || '/login'} replace />;
  }

  if (!setupComplete && !isSetupRoute && requiredRole !== 'admin') {
    const setupPath = requiredRole === 'company' ? '/setup/company' : '/setup/candidate';
    return <Navigate to={setupPath} replace />;
  }

  return <Outlet />;
}
