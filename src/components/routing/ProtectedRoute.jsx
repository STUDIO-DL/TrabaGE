import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AuthLoadingScreen from '../auth/AuthLoadingScreen';
import { getPreviewMode } from '../../constants/preview';

export default function ProtectedRoute() {
  const { isAuthenticated, emailVerified, loading } = useAuth();
  const location = useLocation();
  const previewActive = getPreviewMode();

  if (loading && !previewActive) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated && !previewActive) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!emailVerified && !previewActive) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, emailVerificationRequired: true }}
      />
    );
  }

  return <Outlet />;
}
