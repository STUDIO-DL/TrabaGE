import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AuthLoadingScreen from '../auth/AuthLoadingScreen';

const ROLE_RESOLVE_TIMEOUT_MS = 20000;

/**
 * Blocks authenticated users from guest auth pages (login, verify-email, etc.).
 * Shows a loader until session + role hydration completes — never flash Register.
 */
export default function GuestOnlyRoute() {
  const { isAuthenticated, isPreviewMode, role, getHomePath, loading, refreshAuthState } =
    useAuth();
  const [roleWaitExpired, setRoleWaitExpired] = useState(false);

  useEffect(() => {
    if (isPreviewMode || loading || !isAuthenticated || role) return;
    void refreshAuthState();
  }, [isPreviewMode, loading, isAuthenticated, role, refreshAuthState]);

  useEffect(() => {
    if (isPreviewMode || loading || !isAuthenticated || role) {
      setRoleWaitExpired(false);
      return undefined;
    }
    const timer = setTimeout(() => setRoleWaitExpired(true), ROLE_RESOLVE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isPreviewMode, loading, isAuthenticated, role]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && !isPreviewMode) {
    const home = getHomePath();
    if (home) return <Navigate to={home} replace />;

    // Session without role yet — keep loading; only after timeout finish setup.
    if (!role) {
      if (!roleWaitExpired) return <AuthLoadingScreen />;
      return <Navigate to="/register" replace state={{ resumeAccountSetup: true }} />;
    }
  }

  return <Outlet />;
}
