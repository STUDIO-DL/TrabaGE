const ACCOUNT_DELETED_KEY = 'trabage_account_deleted';

/** Set immediately after confirmed account deletion — blocks private fetches/routes. */
export function markAccountDeleted() {
  try {
    sessionStorage.setItem(ACCOUNT_DELETED_KEY, '1');
  } catch {
    // Ignore storage errors; in-memory auth clear still runs.
  }
}

export function isAccountDeleted() {
  try {
    return sessionStorage.getItem(ACCOUNT_DELETED_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearAccountDeleted() {
  try {
    sessionStorage.removeItem(ACCOUNT_DELETED_KEY);
  } catch {
    // Ignore.
  }
}
