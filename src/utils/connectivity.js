/**
 * App connectivity: navigator.onLine + fetch failures + optional Network Information API.
 * UI should subscribe rather than trusting navigator alone.
 */

const listeners = new Set();

let state = {
  browserOffline: typeof navigator !== 'undefined' ? navigator.onLine === false : false,
  serverUnreachable: false,
  /** 'offline' | 'slow' | 'ok' */
  quality: 'ok',
};

function readNetworkQuality() {
  if (typeof navigator === 'undefined') return 'ok';
  if (navigator.onLine === false) return 'offline';
  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return 'ok';
  const type = String(connection.effectiveType || '').toLowerCase();
  if (type === 'slow-2g' || type === '2g') return 'slow';
  if (connection.saveData) return 'slow';
  // downlink in Mb/s — treat very low bandwidth as slow.
  if (typeof connection.downlink === 'number' && connection.downlink > 0 && connection.downlink < 0.5) {
    return 'slow';
  }
  return 'ok';
}

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

function refreshQuality() {
  const next = state.browserOffline || state.serverUnreachable ? 'offline' : readNetworkQuality();
  if (state.quality === next) return;
  state = { ...state, quality: next };
  emit();
}

export function getConnectivityState() {
  const offline = state.browserOffline || state.serverUnreachable;
  const quality = offline ? 'offline' : state.quality === 'offline' ? readNetworkQuality() : state.quality;
  return {
    browserOffline: state.browserOffline,
    serverUnreachable: state.serverUnreachable,
    offline,
    quality,
    isSlow: quality === 'slow',
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
    state = { ...state, serverUnreachable: false, quality: readNetworkQuality() };
  } else {
    state = { ...state, quality: 'offline' };
  }
  emit();
}

export function reportServerUnreachable() {
  if (state.serverUnreachable) return;
  state = { ...state, serverUnreachable: true, quality: 'offline' };
  emit();
}

export function reportServerReachable() {
  if (!state.serverUnreachable && !state.browserOffline) {
    refreshQuality();
    return;
  }
  state = {
    ...state,
    serverUnreachable: false,
    browserOffline: false,
    quality: readNetworkQuality(),
  };
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

/** Lightweight probe used by the offline banner retry button. */
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

  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', refreshQuality);
  }

  setBrowserOffline(navigator.onLine === false);
  refreshQuality();
}
