import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AuthLoadingScreen from '../auth/AuthLoadingScreen';

/**
 * Blocks authenticated users from guest auth pages (login, verify-email, etc.).
 * Shows a loader until session hydration completes to avoid flicker.
 */
export default function GuestOnlyRoute() {
  const { isAuthenticated, isPreviewMode, role, getHomePath, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && !isPreviewMode) {
    const home = getHomePath();
    if (home) return <Navigate to={home} replace />;
    // Session exists but role never hydrated — finish account setup instead of spinning forever.
    if (!role) return <Navigate to="/register" replace state={{ resumeAccountSetup: true }} />;
  }

  return <Outlet />;
}
