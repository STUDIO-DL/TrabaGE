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
import { getResumePathWithinGrace, touchLastActive } from '../utils/appLifecycle';

const ROLE_WAIT_MS = 20000;

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
    refreshAuthState,
  } = useAuth();

  const splashMode = useMemo(() => {
    const resumePath = getResumePathWithinGrace();
    if (resumePath) {
      return { mode: 'quick', minDurationMs: 0, resumePath };
    }
    return { ...resolveStartupSplashMode(), resumePath: null };
  }, []);
  const isFullSplash = splashMode.mode === 'full';

  const [minTimeElapsed, setMinTimeElapsed] = useState(splashMode.minDurationMs === 0);
  const [roleWaitExpired, setRoleWaitExpired] = useState(false);
  const roleRetryRef = useRef(false);
  const navigatingRef = useRef(false);

  const pendingDestination = useMemo(() => {
    if (loading) return null;
    if (splashMode.resumePath) return splashMode.resumePath;
    if (isAuthenticated) {
      if (!role) return null;
      return getHomePath() || '/login';
    }
    return resolveGuestDestination();
  }, [getHomePath, isAuthenticated, loading, role, splashMode.resumePath]);

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
        // Soft exit: do not destroy a possibly-valid session on slow role hydrate.
        navigate('/login', { replace: true });
        return;
      }

      const home = splashMode.resumePath || getHomePath() || '/login';
      navigatingRef.current = true;
      touchLastActive();

      const navigateHome = () => {
        navigate(home, { replace: true });
      };

      if (splashMode.resumePath || splashMode.minDurationMs === 0) {
        navigateHome();
        return;
      }

      if (isFullSplash) {
        void runStartupPreload({ destination: home, userId: user?.id }).finally(navigateHome);
        return;
      }

      const preload = preloadRef.current ?? runStartupPreload({ destination: home, userId: user?.id });
      void preload.finally(navigateHome);
      return;
    }

    const destination = splashMode.resumePath || resolveGuestDestination();
    navigatingRef.current = true;

    const navigateGuest = () => {
      navigate(destination, { replace: true });
    };

    if (splashMode.resumePath || splashMode.minDurationMs === 0) {
      navigateGuest();
      return;
    }

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
    minTimeElapsed,
    navigate,
    preloadRef,
    refreshAuthState,
    role,
    roleWaitExpired,
    splashMode.minDurationMs,
    splashMode.resumePath,
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
