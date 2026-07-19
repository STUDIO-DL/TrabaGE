import { isPwaInstalled } from '../hooks/useInstallPrompt';

const FULL_SPLASH_SEEN_KEY = 'trabage_full_splash_seen';

/** Full branded splash — first browser visit only (2–3 s). */
export const FULL_SPLASH_MS = 2500;

/** Minimal “T” transition for returning / installed users. */
export const QUICK_SPLASH_MS = 350;

export function hasSeenFullSplash() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(FULL_SPLASH_SEEN_KEY) === 'true';
}

export function markFullSplashSeen() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FULL_SPLASH_SEEN_KEY, 'true');
}

/**
 * Full splash only on the very first browser launch.
 * Installed PWA and all subsequent opens use the quick “T” transition.
 */
export function shouldShowFullSplash() {
  if (typeof window === 'undefined') return false;
  if (isPwaInstalled()) return false;
  return !hasSeenFullSplash();
}

export function resolveStartupSplashMode() {
  const full = shouldShowFullSplash();
  return {
    mode: full ? 'full' : 'quick',
    minDurationMs: full ? FULL_SPLASH_MS : QUICK_SPLASH_MS,
  };
}
