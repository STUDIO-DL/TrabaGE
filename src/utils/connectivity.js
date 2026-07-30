/**
 * App connectivity state: navigator.onLine + real fetch/network failures.
 * UI should subscribe rather than trusting navigator alone.
 */

const listeners = new Set();

let state = {
  browserOffline: typeof navigator !== 'undefined' ? navigator.onLine === false : false,
  serverUnreachable: false,
};

function emit() {
  const snapshot = getConnectivityState();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Ignore subscriber errors.
    }
  });
}

export function getConnectivityState() {
  const offline = state.browserOffline || state.serverUnreachable;
  return {
    browserOffline: state.browserOffline,
    serverUnreachable: state.serverUnreachable,
    offline,
  };
}

export function subscribeConnectivity(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setBrowserOffline(offline) {
  const next = Boolean(offline);
  if (state.browserOffline === next) return;
  state = { ...state, browserOffline: next };
  if (!next) {
    // Coming back online — clear temporary unreachable flag; next fetch will re-set if needed.
    state = { ...state, serverUnreachable: false };
  }
  emit();
}

export function reportServerUnreachable() {
  if (state.serverUnreachable) return;
  state = { ...state, serverUnreachable: true };
  emit();
}

export function reportServerReachable() {
  if (!state.serverUnreachable && !state.browserOffline) return;
  state = { ...state, serverUnreachable: false, browserOffline: false };
  emit();
}

export function isNetworkLikeError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('unable to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    (name === 'typeerror' && message.includes('fetch'))
  );
}

/** Lightweight probe used by the offline screen retry button. */
export async function probeConnectivity(timeoutMs = 4000) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setBrowserOffline(true);
    return false;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    // Same-origin asset — works with SPA hosting and does not depend on auth.
    const response = await fetch(`${window.location.origin}/manifest.json?_connectivity=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    });
    if (response.ok) {
      reportServerReachable();
      return true;
    }
    reportServerUnreachable();
    return false;
  } catch (error) {
    if (isNetworkLikeError(error) || error?.name === 'AbortError') {
      reportServerUnreachable();
    }
    return false;
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

let initialized = false;

export function initConnectivityListeners() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const goOffline = () => setBrowserOffline(true);
  const goOnline = () => {
    setBrowserOffline(false);
    void probeConnectivity();
  };

  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);
  setBrowserOffline(navigator.onLine === false);
}
