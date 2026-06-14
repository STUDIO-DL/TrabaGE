import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getOnboardingComplete } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { loading, isAuthenticated, getHomePath } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) return;

      if (isAuthenticated) {
        navigate(getHomePath(), { replace: true });
        return;
      }

      navigate(getOnboardingComplete() ? '/login' : '/onboarding', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [loading, isAuthenticated, getHomePath, navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-primary-600 text-white">
      <h1 className="text-3xl font-bold">TrabaGE</h1>
      <p className="mt-2 text-sm text-primary-100">Donde las oportunidades te encuentran</p>
      <Spinner color="white" size="md" />
    </div>
  );
}
