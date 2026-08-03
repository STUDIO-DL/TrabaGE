const DB_NAME = 'trabage_draft_blobs';
const DB_VERSION = 1;
const STORE = 'blobs';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function blobKey(userId, draftKey, field = 'file') {
  return `${userId}::${draftKey}::${field}`;
}

export async function saveDraftBlob(userId, draftKey, file, field = 'file') {
  if (!userId || !draftKey || !(file instanceof Blob)) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(
        {
          blob: file,
          name: file.name || 'file',
          type: file.type || 'application/octet-stream',
          lastModified: file.lastModified || Date.now(),
          savedAt: Date.now(),
        },
        blobKey(userId, draftKey, field),
      );
    });
    db.close();
  } catch {
    // Best effort — text draft still works without blob.
  }
}

export async function loadDraftBlob(userId, draftKey, field = 'file') {
  if (!userId || !draftKey) return null;
  try {
    const db = await openDb();
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      tx.onerror = () => reject(tx.error);
      const req = tx.objectStore(STORE).get(blobKey(userId, draftKey, field));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!row?.blob) return null;
    return new File([row.blob], row.name || 'file', {
      type: row.type || 'application/octet-stream',
      lastModified: row.lastModified || Date.now(),
    });
  } catch {
    return null;
  }
}

export async function clearDraftBlob(userId, draftKey, field = 'file') {
  if (!userId || !draftKey) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(blobKey(userId, draftKey, field));
    });
    db.close();
  } catch {
    // Ignore.
  }
}

export async function clearAllDraftBlobsForUser(userId) {
  if (!userId) return;
  try {
    const db = await openDb();
    const prefix = `${userId}::`;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        if (String(cursor.key).startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore.
  }
}
