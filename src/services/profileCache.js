/**
 * Single in-memory profile cache shared by every useProfile subscriber.
 * Mutations merge here first; fetches use generation tokens to drop stale responses.
 */

const profileCache = new Map();
const cacheListeners = new Map();
const fetchGenerations = new Map();

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
  const current = profileCache.get(cacheKey);
  const next = current ? { ...current, ...partial } : { ...partial };
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
  setProfileCache(cacheKey, profile);
  return true;
}

export function applyOptimisticUpdate(cacheKey, updater) {
  if (!cacheKey) return () => {};
  const current = profileCache.get(cacheKey);
  const snapshot = current ? { ...current } : null;
  const next =
    typeof updater === 'function'
      ? updater(current ? { ...current } : {})
      : { ...(current ?? {}), ...updater };
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
