import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/branding/logo.png';
import { getOnboardingComplete } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, role, getHomePath } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate(role ? getHomePath() : '/account-type', { replace: true });
        return;
      }

      navigate(getOnboardingComplete() ? '/login' : '/onboarding', { replace: true });
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, role, getHomePath, navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6">
      <img
        src={logoImg}
        alt="TrabaGE"
        width={200}
        height={48}
        className="login-fade-in h-12 w-auto sm:h-14"
        decoding="async"
      />
      <div className="login-fade-in-delayed mt-10">
        <Spinner color="primary" size="md" />
      </div>
    </div>
  );
}
