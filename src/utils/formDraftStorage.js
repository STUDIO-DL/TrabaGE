import { clearAllDraftBlobsForUser, clearDraftBlob } from './draftBlobStore';

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

export function isMeaningfulDraftData(value, depth = 0) {
  if (depth > 12 || value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some((item) => isMeaningfulDraftData(item, depth + 1));
  if (typeof value === 'object') {
    if (value.__fileMeta) return true;
    return Object.values(value).some((nested) => isMeaningfulDraftData(nested, depth + 1));
  }
  return false;
}

/**
 * Persist serializable form values to localStorage.
 * File objects and DOM nodes are stripped automatically.
 * Empty drafts are cleared instead of stored.
 */
export function saveFormDraft(userId, draftKey, data) {
  if (!userId || !draftKey) return;
  const sanitized = sanitizeForStorage(data);
  if (!isMeaningfulDraftData(sanitized)) {
    clearFormDraft(userId, draftKey);
    return;
  }
  const payload = {
    data: sanitized,
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
  if (!isMeaningfulDraftData(parsed.data)) {
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
  void clearDraftBlob(userId, draftKey);
}

export function clearAllFormDrafts(userId) {
  if (!userId) return;
  const keys = readIndex(userId);
  keys.forEach((draftKey) => {
    try {
      localStorage.removeItem(buildStorageKey(userId, draftKey));
    } catch {
      // Ignore.
    }
  });
  try {
    localStorage.removeItem(`${DRAFT_INDEX_PREFIX}${userId}`);
  } catch {
    // Ignore.
  }
  void clearAllDraftBlobsForUser(userId);
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
