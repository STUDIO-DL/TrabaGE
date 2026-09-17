export const PUSH_PROMPT_DISMISS_KEY = 'trabage_push_prompt_dismissed_at';
export const PUSH_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function isHiddenPushPromptRoute(pathname = '') {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/welcome') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/admin')
  );
}

export function wasPushPromptDismissedRecently(now = Date.now(), storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(PUSH_PROMPT_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return now - dismissedAt < PUSH_PROMPT_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Soft prompt visibility for THIS device.
 * Account-level push_enabled must not hide the prompt on a new browser that
 * still needs the OS permission (or a user who granted OS permission but never
 * flipped the in-app master toggle).
 */
export function shouldShowPushPermissionPrompt({
  loading = false,
  isAuthenticated = false,
  isPreviewMode = false,
  userId = null,
  role = null,
  setupComplete = false,
  prefsLoading = false,
  pushEnabled = false,
  osPermission = 'default',
  isConfigured = false,
  isSupported = false,
  dismissedRecently = false,
  hiddenRoute = false,
} = {}) {
  if (
    loading ||
    !isAuthenticated ||
    isPreviewMode ||
    !userId ||
    role === 'admin' ||
    !setupComplete ||
    prefsLoading ||
    !isConfigured ||
    !isSupported ||
    dismissedRecently ||
    hiddenRoute
  ) {
    return false;
  }

  if (osPermission === 'denied') {
    return false;
  }

  if (osPermission === 'granted' && pushEnabled) {
    return false;
  }

  return true;
}
