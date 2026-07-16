import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME, ROLE_SETUP, normalizeRole } from '../../constants/roles';
import { getPreviewRole, isPreviewActive } from '../../constants/preview';
import AuthLoadingScreen from '../auth/AuthLoadingScreen';

const ROLE_RESOLVE_TIMEOUT_MS = 8000;

/**
 * @param {object} props
 * @param {string} [props.role] - single required role
 * @param {string[]} [props.roles] - any of these roles allowed (e.g. business + organization)
 */
export default function RoleRoute({ role: requiredRole, roles: requiredRoles }) {
  const { role, isPreviewMode, loading, isAuthenticated, refreshAuthState, setupComplete } =
    useAuth();
  const location = useLocation();
  const allowedRoles = requiredRoles ?? (requiredRole ? [requiredRole] : []);
  const previewActive = allowedRoles.includes('admin') ? false : isPreviewActive(isPreviewMode);
  const rawRole = role ?? (previewActive ? getPreviewRole() : null);
  const effectiveRole = normalizeRole(rawRole) ?? rawRole;
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
    return <AuthLoadingScreen />;
  }

  // Keep a quiet loader while role hydrates — never flash /register mid-login.
  if (!previewActive && isAuthenticated && !effectiveRole) {
    if (!roleWaitExpired) {
      return <AuthLoadingScreen />;
    }
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(effectiveRole)) {
    if (allowedRoles.includes('admin')) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={ROLE_HOME[effectiveRole] || '/login'} replace />;
  }

  // Gate users whose required profile data is incomplete into the setup
  // assistant. Setup routes for business and organization both use CompanySetup.
  const setupPath = ROLE_SETUP[effectiveRole];
  const onSetupPath = location.pathname.startsWith('/setup/');
  if (!previewActive && setupPath && !setupComplete && !onSetupPath) {
    return <Navigate to={setupPath} replace />;
  }

  return <Outlet />;
}
