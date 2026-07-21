/** Detect and recover from stale PWA / deploy chunk load failures. */

const CHUNK_RELOAD_KEY = 'trabage_chunk_reload_once';

export function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading chunk') ||
    error?.name === 'ChunkLoadError'
  );
}

/**
 * One hard reload per tab session for chunk failures. Also nudges the service
 * worker so the next load is not stuck on a stale precache shell.
 */
export function recoverFromChunkError(error) {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) return false;

  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  } catch {
    // Private mode — still attempt reload below.
  }

  void (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (reg) => {
            try {
              await reg.update();
            } catch {
              // Ignore update errors; reload still helps.
            }
          }),
        );
      }
    } finally {
      window.location.reload();
    }
  })();

  return true;
}

export function clearChunkReloadGuard() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // Ignore.
  }
}
