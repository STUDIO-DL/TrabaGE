import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearFormDraft,
  loadFormDraft,
  saveFormDraft,
} from '../utils/formDraftStorage';

const AUTOSAVE_DELAY_MS = 400;

/**
 * Keeps form state in memory and mirrors it to localStorage while editing.
 * Restores the latest draft on mount; clears on successful submit via clearDraft().
 */
export function useFormDraft({
  draftKey,
  userId,
  initialValues,
  enabled = true,
  autosaveDelay = AUTOSAVE_DELAY_MS,
}) {
  const [values, setValuesState] = useState(initialValues);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const hydratedRef = useRef(false);
  const prevEnabledRef = useRef(false);
  const skipSaveRef = useRef(false);
  const initialRef = useRef(initialValues);

  initialRef.current = initialValues;

  // Hydrate when enabled (e.g. modal opens). Re-hydrates each time enabled flips true.
  useEffect(() => {
    const justEnabled = enabled && !prevEnabledRef.current;
    prevEnabledRef.current = enabled;

    if (!enabled) return;

    if (justEnabled) {
      hydratedRef.current = false;
    }

    if (!userId || !draftKey) {
      if (!hydratedRef.current) {
        setValuesState(initialRef.current);
        hydratedRef.current = true;
      }
      return;
    }

    if (hydratedRef.current) return;

    const draft = loadFormDraft(userId, draftKey);
    if (draft?.data && typeof draft.data === 'object') {
      setValuesState({ ...initialRef.current, ...draft.data });
      setRestoredFromDraft(true);
    } else {
      setValuesState(initialRef.current);
    }
    hydratedRef.current = true;
  }, [draftKey, userId, enabled]);

  // Debounced autosave.
  useEffect(() => {
    if (!enabled || !userId || !draftKey || !hydratedRef.current) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      saveFormDraft(userId, draftKey, values);
    }, autosaveDelay);

    return () => window.clearTimeout(timer);
  }, [values, userId, draftKey, enabled, autosaveDelay]);

  const setValues = useCallback((updater) => {
    setValuesState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const clearDraft = useCallback(() => {
    if (userId && draftKey) {
      skipSaveRef.current = true;
      clearFormDraft(userId, draftKey);
    }
    setRestoredFromDraft(false);
  }, [userId, draftKey]);

  const resetToInitial = useCallback((nextInitial) => {
    skipSaveRef.current = true;
    const base = nextInitial ?? initialRef.current;
    setValuesState(base);
  }, []);

  return {
    values,
    setValues,
    clearDraft,
    resetToInitial,
    restoredFromDraft,
    isHydrated: hydratedRef.current,
  };
}
