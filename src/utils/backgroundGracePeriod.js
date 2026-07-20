/** Minimum time in background before any automatic foreground refresh is allowed. */
export const BACKGROUND_GRACE_MS = 5 * 60 * 1000;

/** Window in which visibility + focus events from the same resume are treated as one. */
const RESUME_WINDOW_MS = 500;

let hiddenAt =
  typeof document !== 'undefined' && document.visibilityState === 'hidden' ? Date.now() : null;
let recentBackgroundMs = 0;
let recentBackgroundSetAt = 0;

function trackVisibilityChange() {
  const now = Date.now();
  if (document.visibilityState === 'hidden') {
    hiddenAt = now;
    return;
  }
  if (document.visibilityState === 'visible' && hiddenAt != null) {
    recentBackgroundMs = now - hiddenAt;
    recentBackgroundSetAt = now;
    hiddenAt = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', trackVisibilityChange);
}

/** Background duration (ms) for the most recent foreground resume, or 0 if none/expired. */
export function getRecentBackgroundMs() {
  if (Date.now() - recentBackgroundSetAt > RESUME_WINDOW_MS) return 0;
  return recentBackgroundMs;
}

/** True only when the app just returned from background for longer than the grace threshold. */
export function shouldAllowForegroundRefresh(thresholdMs = BACKGROUND_GRACE_MS) {
  const bgMs = getRecentBackgroundMs();
  if (bgMs === 0) return false;
  return bgMs >= thresholdMs;
}
