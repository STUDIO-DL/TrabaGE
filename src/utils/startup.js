import { isPwaInstalled } from '../hooks/useInstallPrompt';

const FULL_SPLASH_SEEN_KEY = 'trabage_full_splash_seen';
const ONBOARDING_KEY = 'trabage_onboarding_complete';
const AUTH_STORAGE_KEY = 'trabage-auth';
const THEME_STORAGE_KEY = 'trabage_theme';

/** Full branded splash — first browser visit only (2–3 s). */
export const FULL_SPLASH_MS = 2500;

/** Minimal “T” transition for returning / installed users. */
export const QUICK_SPLASH_MS = 350;

function readStorage(key) {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function hasSeenFullSplash() {
  return readStorage(FULL_SPLASH_SEEN_KEY) === 'true';
}

export function markFullSplashSeen() {
  writeStorage(FULL_SPLASH_SEEN_KEY, 'true');
}

/**
 * Detects users who used TrabaGE before the startup splash refactor.
 * Covers long-time PWA installs, returning browser sessions and expired logins.
 */
export function hasLegacyAppUsage() {
  if (readStorage(ONBOARDING_KEY) === 'true') return true;
  if (readStorage(AUTH_STORAGE_KEY)) return true;
  if (readStorage(THEME_STORAGE_KEY)) return true;
  if (readStorage('trabage_search_history')) return true;
  return false;
}

export function isReturningUser() {
  if (typeof window === 'undefined') return true;
  return isPwaInstalled() || hasSeenFullSplash() || hasLegacyAppUsage();
}

/**
 * Full splash only for brand-new browser visitors.
 * Installed PWA and every returning user get the quick “T” transition.
 */
export function shouldShowFullSplash() {
  if (typeof window === 'undefined') return false;
  return !isReturningUser();
}

export function resolveStartupSplashMode() {
  const full = shouldShowFullSplash();
  return {
    mode: full ? 'full' : 'quick',
    minDurationMs: full ? FULL_SPLASH_MS : QUICK_SPLASH_MS,
  };
}

/** One-time migration so legacy installs never see the full splash again. */
export function bootstrapLegacyStartupFlags() {
  if (typeof window === 'undefined') return;
  if (isReturningUser()) {
    markFullSplashSeen();
  }
}

export const STARTUP_STORAGE_KEYS = {
  FULL_SPLASH_SEEN_KEY,
  ONBOARDING_KEY,
  AUTH_STORAGE_KEY,
  THEME_STORAGE_KEY,
};
