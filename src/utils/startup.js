import { isPwaInstalled } from '../hooks/useInstallPrompt';

const FULL_SPLASH_SEEN_KEY = 'trabage_full_splash_seen';
const ONBOARDING_KEY = 'trabage_onboarding_complete';
const AUTH_STORAGE_KEY = 'trabage-auth';
const THEME_STORAGE_KEY = 'trabage_theme';

/** Full branded splash — shown as the single splash for all startups (~3 s). */
export const FULL_SPLASH_MS = 3000;

/** Quick splash kept for legacy paths but not used as primary startup anymore. */
export const QUICK_SPLASH_MS = 3000;

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
  // Always show the full branded splash as the primary splash screen.
  // Returning users will no longer see the small quick "T" splash as a separate step.
  if (typeof window === 'undefined') return false;
  return true;
}

export function resolveStartupSplashMode() {
  // Force full mode to ensure a single unified splash experience.
  return {
    mode: 'full',
    minDurationMs: FULL_SPLASH_MS,
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
