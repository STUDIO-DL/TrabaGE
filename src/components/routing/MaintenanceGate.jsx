import { Navigate, useLocation } from 'react-router-dom';
import { MAINTENANCE_ROUTE } from '../../constants/legalRoutes';
import { useMaintenance } from '../../context/MaintenanceContext';
import { isPathAllowedDuringMaintenance } from '../../hooks/useMaintenanceMode';

/**
 * Blocks product UI for non-admins while maintenance is active.
 * Admins always pass. Login / auth / admin / legal stay available.
 */
export default function MaintenanceGate({ children }) {
  const location = useLocation();
  const { shouldBlock, loading } = useMaintenance();

  if (loading && !shouldBlock) {
    return children;
  }

  if (!shouldBlock) {
    if (location.pathname === MAINTENANCE_ROUTE) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  if (isPathAllowedDuringMaintenance(location.pathname)) {
    return children;
  }

  return <Navigate to={MAINTENANCE_ROUTE} replace />;
}
