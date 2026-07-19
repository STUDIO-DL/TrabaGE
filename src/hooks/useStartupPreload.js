import { useEffect, useRef } from 'react';

import { normalizeTheme, THEME_STORAGE_KEY } from '../constants/theme';
import { appearanceService } from '../services/appearance.service';
import { notificationPreferencesService } from '../services/notificationPreferences.service';

const ROUTE_PREFETCH = {
  '/login': () => import('../pages/auth/Login'),
  '/onboarding': () => import('../pages/onboarding/OnboardingFlow'),
  '/personal/feed': () => import('../pages/candidate/Feed'),
  '/business/dashboard': () => import('../pages/company/Dashboard'),
  '/organization/dashboard': () => import('../pages/company/Dashboard'),
  '/admin': () => import('../pages/admin/AdminDashboard'),
  '/setup/personal': () => import('../pages/setup/CandidateSetup'),
  '/setup/business': () => import('../pages/setup/CompanySetup'),
  '/setup/organization': () => import('../pages/setup/CompanySetup'),
};

function prefetchRoute(path) {
  const loader = ROUTE_PREFETCH[path];
  return loader ? loader() : Promise.resolve();
}

function preloadAuthenticatedResources(userId) {
  return Promise.allSettled([
    appearanceService.getOrCreate().then(({ data }) => {
      if (!data?.theme || typeof window === 'undefined') return;
      const theme = normalizeTheme(data.theme);
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      const root = document.documentElement;
      root.dataset.theme = theme;
      root.classList.toggle('dark', theme === 'dark');
      root.style.colorScheme = theme;
    }),
    notificationPreferencesService.getOrCreate(userId),
  ]);
}

/**
 * Silently warm session-adjacent data and the next route chunk while the
 * quick “T” splash is visible.
 */
export function runStartupPreload({ destination, userId }) {
  const tasks = [prefetchRoute(destination)];

  if (userId) {
    tasks.push(preloadAuthenticatedResources(userId));
  }

  return Promise.allSettled(tasks);
}

/** Starts preload once per destination change; safe to call from SplashScreen. */
export function useStartupPreload({ enabled, destination, userId }) {
  const preloadRef = useRef(null);
  const lastDestinationRef = useRef(null);

  useEffect(() => {
    if (!enabled || !destination || destination === lastDestinationRef.current) return;

    lastDestinationRef.current = destination;
    preloadRef.current = runStartupPreload({ destination, userId });
  }, [destination, enabled, userId]);

  return preloadRef;
}
