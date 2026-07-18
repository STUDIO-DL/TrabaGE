/**
 * Single in-memory profile cache shared by every useProfile subscriber.
 * Mutations merge here first; fetches are coalesced per cache key so concurrent
 * mounts (FeedHeader, PostComposer, etc.) share one in-flight request.
 */

const profileCache = new Map();
const cacheListeners = new Map();
const fetchGenerations = new Map();
const inflightFetches = new Map();

function omitUndefined(partial) {
  if (!partial) return {};
  return Object.fromEntries(Object.entries(partial).filter(([, value]) => value !== undefined));
}

export function getCacheKey(targetId, { role, isPreviewMode, viewingOtherCandidate, isEmployerRole }) {
  if (!targetId || isPreviewMode) return null;
  if (viewingOtherCandidate) return `public:candidate:${targetId}`;
  if (!isEmployerRole(role)) return `own:candidate:${targetId}`;
  return `own:company:${targetId}`;
}

export function getCachedProfile(cacheKey) {
  if (!cacheKey) return null;
  return profileCache.get(cacheKey) ?? null;
}

function notifyListeners(cacheKey, profile) {
  cacheListeners.get(cacheKey)?.forEach((listener) => listener(profile));
}

export function setProfileCache(cacheKey, profile) {
  if (!cacheKey) return;
  profileCache.set(cacheKey, profile);
  notifyListeners(cacheKey, profile);
}

export function mergeProfileCache(cacheKey, partial) {
  if (!cacheKey || !partial) return getCachedProfile(cacheKey);
  const patch = omitUndefined(partial);
  if (Object.keys(patch).length === 0) return getCachedProfile(cacheKey);
  const current = profileCache.get(cacheKey);
  const next = current ? { ...current, ...patch } : { ...patch };
  setProfileCache(cacheKey, next);
  return next;
}

export function mergeOwnCandidateProfile(userId, partial) {
  if (!userId || !partial) return null;
  return mergeProfileCache(`own:candidate:${userId}`, partial);
}

export function mergeOwnCompanyProfile(userId, partial) {
  if (!userId || !partial) return null;
  return mergeProfileCache(`own:company:${userId}`, partial);
}

export function subscribeProfileCache(cacheKey, listener) {
  if (!cacheKey) return () => {};
  if (!cacheListeners.has(cacheKey)) cacheListeners.set(cacheKey, new Set());
  cacheListeners.get(cacheKey).add(listener);
  return () => cacheListeners.get(cacheKey)?.delete(listener);
}

export function beginProfileFetch(cacheKey) {
  if (!cacheKey) return 0;
  const generation = (fetchGenerations.get(cacheKey) ?? 0) + 1;
  fetchGenerations.set(cacheKey, generation);
  return generation;
}

export function commitProfileFetch(cacheKey, generation, profile) {
  if (!cacheKey || fetchGenerations.get(cacheKey) !== generation) return false;
  if (profile == null) return false;
  setProfileCache(cacheKey, profile);
  return true;
}

/**
 * Coalesce concurrent reads for the same cache key. Pass force=true after
 * mutations so post-save refetches are not deduped against the initial load.
 */
export async function fetchProfileCached(cacheKey, fetcher, { force = false } = {}) {
  if (!cacheKey) return { data: null, error: null };

  if (!force && inflightFetches.has(cacheKey)) {
    return inflightFetches.get(cacheKey);
  }

  const generation = beginProfileFetch(cacheKey);

  const promise = (async () => {
    try {
      const result = await fetcher();
      const { data, error } = result ?? {};
      if (!error && data != null && fetchGenerations.get(cacheKey) === generation) {
        setProfileCache(cacheKey, data);
      }
      return { data: data ?? null, error: error ?? null };
    } catch (error) {
      return { data: null, error };
    } finally {
      if (inflightFetches.get(cacheKey) === promise) {
        inflightFetches.delete(cacheKey);
      }
    }
  })();

  inflightFetches.set(cacheKey, promise);
  return promise;
}

export function applyOptimisticUpdate(cacheKey, updater) {
  if (!cacheKey) return () => {};
  const current = profileCache.get(cacheKey);
  const snapshot = current ? { ...current } : null;
  const next =
    typeof updater === 'function'
      ? updater(current ? { ...current } : {})
      : { ...(current ?? {}), ...omitUndefined(updater) };
  setProfileCache(cacheKey, next);
  return () => {
    if (snapshot) {
      setProfileCache(cacheKey, snapshot);
    } else {
      profileCache.delete(cacheKey);
      notifyListeners(cacheKey, null);
    }
  };
}

export function patchProfileCollection(cacheKey, collectionKey, patchFn) {
  return applyOptimisticUpdate(cacheKey, (profile) => ({
    ...profile,
    [collectionKey]: patchFn(profile[collectionKey] ?? []),
  }));
}
