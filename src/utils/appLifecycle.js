/** Tracks app background/foreground and last route for 5-minute resume. */

const GRACE_MS = 5 * 60 * 1000;
const LAST_PATH_KEY = 'trabage_last_path';
const LAST_ACTIVE_KEY = 'trabage_last_active_at';
const BACKGROUND_AT_KEY = 'trabage_background_at';
/** Absolute deadline — must NOT be cleared on soft resume (survives reload). */
const RESUME_UNTIL_KEY = 'trabage_resume_until';
const AUTH_CACHE_KEY = 'trabage_auth_resume_cache';
/** Native file picker open / settle window (CV, photos, etc.). */
const FILE_PICK_UNTIL_KEY = 'trabage_file_pick_until';

let backgroundAt = null;
let filePickUntil = 0;

function writeStore(key, value) {
  try {
    // localStorage first: survives process kill; sessionStorage can be wiped with the tab.
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore quota / private mode.
  }
}

function readStore(key) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeStore(key) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function extendResumeDeadline(fromMs = Date.now()) {
  writeStore(RESUME_UNTIL_KEY, String(fromMs + GRACE_MS));
}

function peekFilePickUntil() {
  const stored = Number(readStore(FILE_PICK_UNTIL_KEY) || 0);
  return Math.max(filePickUntil, stored);
}

/**
 * Call before opening the OS file picker. Selecting a file backgrounds the WebView
 * (visibilitychange) — that must NOT remount the app or wipe forms.
 */
export function beginNativeFilePick() {
  const until = Date.now() + GRACE_MS;
  filePickUntil = until;
  writeStore(FILE_PICK_UNTIL_KEY, String(until));
  extendResumeDeadline();
  touchLastActive();
  if (typeof window !== 'undefined') {
    rememberLastPath(window.location.pathname + window.location.search + window.location.hash);
  }
}

/** Call when the picker closes (file chosen, cancel, or return to the app). */
export function endNativeFilePick() {
  // Brief settle so visibility/focus after the picker still see the pick window.
  const settleUntil = Date.now() + 2000;
  filePickUntil = Math.max(peekFilePickUntil(), settleUntil);
  writeStore(FILE_PICK_UNTIL_KEY, String(filePickUntil));
  touchLastActive();
}

export function isNativeFilePickActive() {
  return peekFilePickUntil() > Date.now();
}

/**
 * Document-level guards for every `<input type="file">` (hidden + programmatic click).
 * Install once from App.
 */
export function installNativeFilePickGuards() {
  if (typeof document === 'undefined') return () => {};

  const isFileInput = (target) =>
    Boolean(target && target.tagName === 'INPUT' && target.type === 'file');

  const onClickCapture = (event) => {
    if (isFileInput(event.target)) beginNativeFilePick();
  };

  const onChangeCapture = (event) => {
    if (isFileInput(event.target)) endNativeFilePick();
  };

  // Chromium / Android: fires when the user dismisses the picker without a file.
  const onCancelCapture = (event) => {
    if (isFileInput(event.target)) endNativeFilePick();
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible' && isNativeFilePickActive()) {
      endNativeFilePick();
    }
  };

  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('change', onChangeCapture, true);
  document.addEventListener('cancel', onCancelCapture, true);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('change', onChangeCapture, true);
    document.removeEventListener('cancel', onCancelCapture, true);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export function markAppBackground() {
  backgroundAt = Date.now();
  writeStore(BACKGROUND_AT_KEY, String(backgroundAt));
  // File picker also backgrounds the page — keep the same 5-minute no-refresh window.
  extendResumeDeadline(backgroundAt);
  if (typeof window !== 'undefined') {
    rememberLastPath(window.location.pathname + window.location.search + window.location.hash);
  }
}

export function markAppForeground() {
  // Keep durable resume markers until the deadline expires (do not clear on soft resume).
  touchLastActive();
  if (isNativeFilePickActive()) {
    endNativeFilePick();
  }
}

export function peekBackgroundAt() {
  if (backgroundAt != null) return backgroundAt;
  const stored = Number(readStore(BACKGROUND_AT_KEY) || 0);
  return stored > 0 ? stored : null;
}

export function getBackgroundDurationMs() {
  const at = peekBackgroundAt();
  if (at == null) return null;
  return Date.now() - at;
}

/** True when returning from background within the 5-minute no-refresh window. */
export function isWithinForegroundGrace(maxMs = GRACE_MS) {
  const now = Date.now();

  // OS file picker: treat as temporary interruption, never a "left the app" refresh.
  if (isNativeFilePickActive()) return true;

  const resumeUntil = Number(readStore(RESUME_UNTIL_KEY) || 0);
  if (resumeUntil > now) return true;

  const ms = getBackgroundDurationMs();
  if (ms != null && ms < maxMs) return true;

  // Cold start after process kill: last activity within window counts.
  const lastActive = Number(readStore(LAST_ACTIVE_KEY) || 0);
  if (lastActive && now - lastActive < maxMs) return true;

  return false;
}

export function rememberLastPath(path) {
  if (!path || path === '/' || path.startsWith('/auth/') || path === '/login') return;
  writeStore(LAST_PATH_KEY, path);
  touchLastActive();
  // Do NOT extend resumeUntil here — that made grace last forever across boots.
}

export function touchLastActive() {
  writeStore(LAST_ACTIVE_KEY, String(Date.now()));
}

/**
 * Last in-app path if the user left within the grace window.
 * Used to skip splash → home and restore the exact screen after a process kill.
 */
export function getResumePathWithinGrace(maxMs = GRACE_MS) {
  if (!isWithinForegroundGrace(maxMs)) return null;
  const path = readStore(LAST_PATH_KEY);
  if (!path || path === '/') return null;
  return path;
}

/** Silent role cache so cold starts within grace skip AuthLoadingScreen remount. */
export function writeAuthResumeCache({ userId, role, setupComplete }) {
  if (!userId || !role) return;
  try {
    writeStore(
      AUTH_CACHE_KEY,
      JSON.stringify({
        userId,
        role,
        setupComplete: Boolean(setupComplete),
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore.
  }
}

export function readAuthResumeCache(maxMs = GRACE_MS) {
  if (!isWithinForegroundGrace(maxMs)) return null;
  try {
    const raw = readStore(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.userId || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthResumeCache() {
  removeStore(AUTH_CACHE_KEY);
}

export const FOREGROUND_GRACE_MS = GRACE_MS;
