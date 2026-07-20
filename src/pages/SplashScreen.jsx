import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ZarrelCredit from '../components/branding/ZarrelCredit';
import MobileScreenLayout from '../components/layout/MobileScreenLayout';
import EquatorialGuineaMap from '../components/splash/EquatorialGuineaMap';
import TrabaGEIconMark from '../components/splash/TrabaGEIconMark';
import TrabaGEWordmark from '../components/splash/TrabaGEWordmark';
import { getOnboardingComplete } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import { useStartupPreload, runStartupPreload } from '../hooks/useStartupPreload';
import {
  bootstrapLegacyStartupFlags,
  markFullSplashSeen,
  resolveStartupSplashMode,
} from '../utils/startup';

const ROLE_WAIT_MS = 8000;

function resolveGuestDestination() {
  return getOnboardingComplete() ? '/login' : '/onboarding';
}

export default function SplashScreen() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    role,
    user,
    getHomePath,
    loading,
    logout,
    refreshAuthState,
  } = useAuth();

  const splashMode = useMemo(() => resolveStartupSplashMode(), []);
  const isFullSplash = splashMode.mode === 'full';

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [roleWaitExpired, setRoleWaitExpired] = useState(false);
  const roleRetryRef = useRef(false);
  const navigatingRef = useRef(false);

  const pendingDestination = useMemo(() => {
    if (loading) return null;
    if (isAuthenticated) {
      if (!role) return null;
      return getHomePath() || '/login';
    }
    return resolveGuestDestination();
  }, [getHomePath, isAuthenticated, loading, role]);

  const preloadRef = useStartupPreload({
    enabled: !isFullSplash,
    destination: pendingDestination,
    userId: user?.id,
  });

  useEffect(() => {
    bootstrapLegacyStartupFlags();
  }, []);

  useEffect(() => {
    if (!isFullSplash) return undefined;
    const timer = setTimeout(() => {
      markFullSplashSeen();
    }, splashMode.minDurationMs);
    return () => clearTimeout(timer);
  }, [isFullSplash, splashMode.minDurationMs]);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), splashMode.minDurationMs);
    return () => clearTimeout(timer);
  }, [splashMode.minDurationMs]);

  useEffect(() => {
    if (loading || !minTimeElapsed || !isAuthenticated || role) {
      setRoleWaitExpired(false);
      return undefined;
    }
    const timer = setTimeout(() => setRoleWaitExpired(true), ROLE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [loading, minTimeElapsed, isAuthenticated, role]);

  useEffect(() => {
    if (role) roleRetryRef.current = false;
  }, [role]);

  useEffect(() => {
    if (loading || !minTimeElapsed || navigatingRef.current) return;

    if (isAuthenticated) {
      if (!role) {
        if (!roleWaitExpired) return;
        if (!roleRetryRef.current) {
          roleRetryRef.current = true;
          setRoleWaitExpired(false);
          void refreshAuthState();
          return;
        }
        navigatingRef.current = true;
        void logout().then(() => navigate('/login', { replace: true }));
        return;
      }

      const home = getHomePath() || '/login';
      navigatingRef.current = true;

      const navigateHome = () => {
        navigate(home, { replace: true });
      };

      if (isFullSplash) {
        void runStartupPreload({ destination: home, userId: user?.id }).finally(navigateHome);
        return;
      }

      const preload = preloadRef.current ?? runStartupPreload({ destination: home, userId: user?.id });
      void preload.finally(navigateHome);
      return;
    }

    const destination = resolveGuestDestination();
    navigatingRef.current = true;

    const navigateGuest = () => {
      navigate(destination, { replace: true });
    };

    if (isFullSplash) {
      void runStartupPreload({ destination, userId: null }).finally(navigateGuest);
      return;
    }

    const preload =
      preloadRef.current ?? runStartupPreload({ destination, userId: null });
    void preload.finally(navigateGuest);
  }, [
    getHomePath,
    isAuthenticated,
    isFullSplash,
    loading,
    logout,
    minTimeElapsed,
    navigate,
    preloadRef,
    refreshAuthState,
    role,
    roleWaitExpired,
    user?.id,
  ]);

  if (!isFullSplash) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-app-bg pt-safe pb-safe"
        aria-busy="true"
        aria-label="Abriendo TrabaGE"
      >
        <TrabaGEIconMark className="h-12 w-12" />
      </div>
    );
  }

  return (
    <MobileScreenLayout
      contentClassName="items-center justify-center px-space-base"
      noScroll
      className="bg-app-bg"
      footerClassName="!border-0 !bg-transparent !pt-0"
      footer={
        <div className="flex justify-center pb-1">
          <ZarrelCredit variant="developed" className="splash-tagline-in" />
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <TrabaGEWordmark className="splash-logo-in h-10 w-auto sm:h-11" />

        <EquatorialGuineaMap
          className="splash-map-in splash-map-glow mt-lg h-8 w-auto text-primary-600 sm:h-9"
        />

        <p className="splash-tagline-in mt-lg max-w-[16rem] text-body-small leading-snug text-app-muted sm:max-w-xs">
          La plataforma de empleo y oportunidades para Guinea Ecuatorial
        </p>
      </div>
    </MobileScreenLayout>
  );
}
