const DRAFT_PREFIX = 'trabage_form_draft_';
const DRAFT_INDEX_PREFIX = 'trabage_form_draft_index_';
/** Drafts expire after 7 days. */
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readIndex(userId) {
  if (!userId) return [];
  const parsed = safeParse(localStorage.getItem(`${DRAFT_INDEX_PREFIX}${userId}`));
  return Array.isArray(parsed) ? parsed : [];
}

function writeIndex(userId, keys) {
  if (!userId) return;
  try {
    localStorage.setItem(`${DRAFT_INDEX_PREFIX}${userId}`, JSON.stringify(keys));
  } catch {
    // Storage full or blocked — ignore.
  }
}

function buildStorageKey(userId, draftKey) {
  return `${DRAFT_PREFIX}${userId}_${draftKey}`;
}

/**
 * Persist serializable form values to localStorage.
 * File objects and DOM nodes are stripped automatically.
 */
export function saveFormDraft(userId, draftKey, data) {
  if (!userId || !draftKey) return;
  const payload = {
    data: sanitizeForStorage(data),
    savedAt: Date.now(),
    draftKey,
  };
  try {
    localStorage.setItem(buildStorageKey(userId, draftKey), JSON.stringify(payload));
    const index = readIndex(userId);
    if (!index.includes(draftKey)) {
      writeIndex(userId, [...index, draftKey]);
    }
  } catch {
    // Quota exceeded — best effort.
  }
}

export function loadFormDraft(userId, draftKey) {
  if (!userId || !draftKey) return null;
  const parsed = safeParse(localStorage.getItem(buildStorageKey(userId, draftKey)));
  if (!parsed?.data) return null;
  if (parsed.savedAt && Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
    clearFormDraft(userId, draftKey);
    return null;
  }
  return parsed;
}

export function clearFormDraft(userId, draftKey) {
  if (!userId || !draftKey) return;
  try {
    localStorage.removeItem(buildStorageKey(userId, draftKey));
    writeIndex(userId, readIndex(userId).filter((key) => key !== draftKey));
  } catch {
    // Ignore.
  }
}

export function listFormDrafts(userId) {
  if (!userId) return [];
  return readIndex(userId)
    .map((draftKey) => loadFormDraft(userId, draftKey))
    .filter(Boolean);
}

function sanitizeForStorage(value, depth = 0) {
  if (depth > 12) return null;
  if (value == null) return value;
  if (typeof value === 'function') return undefined;
  if (value instanceof File || value instanceof Blob) {
    return {
      __fileMeta: true,
      name: value.name,
      size: value.size,
      type: value.type,
    };
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForStorage(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const next = {};
    Object.entries(value).forEach(([key, nested]) => {
      const sanitized = sanitizeForStorage(nested, depth + 1);
      if (sanitized !== undefined) next[key] = sanitized;
    });
    return next;
  }
  return value;
}
