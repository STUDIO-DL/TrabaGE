import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileScreenLayout from '../components/layout/MobileScreenLayout';
import EquatorialGuineaMap from '../components/splash/EquatorialGuineaMap';
import TrabaGEWordmark from '../components/splash/TrabaGEWordmark';
import { getOnboardingComplete } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';

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
    <MobileScreenLayout
      contentClassName="items-center justify-center px-md"
      noScroll
      className="bg-white"
    >
      <div className="flex flex-col items-center text-center">
        <TrabaGEWordmark className="splash-logo-in h-10 w-auto sm:h-11" />

        <EquatorialGuineaMap
          className="splash-map-in splash-map-glow mt-lg h-8 w-auto text-primary-600 sm:h-9"
        />

        <p className="splash-tagline-in mt-lg max-w-[16rem] text-small leading-snug text-[#64748B] sm:max-w-xs sm:text-body">
          La plataforma de empleo y oportunidades para Guinea Ecuatorial
        </p>
      </div>
    </MobileScreenLayout>
  );
}
