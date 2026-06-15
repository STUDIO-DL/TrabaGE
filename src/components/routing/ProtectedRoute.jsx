import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import { getPreviewMode } from '../../constants/preview';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const previewActive = getPreviewMode();

  if (loading && !previewActive) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated && !previewActive) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
