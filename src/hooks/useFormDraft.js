import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearFormDraft,
  isMeaningfulDraftData,
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
  const [wasRestored, setWasRestored] = useState(false);
  const hydratedRef = useRef(false);
  const prevEnabledRef = useRef(false);
  const skipSaveRef = useRef(false);
  const initialRef = useRef(initialValues);
  const pendingSaveTimerRef = useRef(null);
  const valuesRef = useRef(values);

  initialRef.current = initialValues;
  valuesRef.current = values;

  // Hydrate when enabled (e.g. modal opens). Re-hydrates each time enabled flips true.
  useEffect(() => {
    const justEnabled = enabled && !prevEnabledRef.current;
    prevEnabledRef.current = enabled;

    if (!enabled) return;

    if (justEnabled) {
      hydratedRef.current = false;
      restoredNotifiedRef.current = false;
      setWasRestored(false);
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
      setWasRestored(true);
    } else {
      setValuesState(initialRef.current);
      setWasRestored(false);
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
      pendingSaveTimerRef.current = null;
    }, autosaveDelay);
    pendingSaveTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (pendingSaveTimerRef.current === timer) {
        pendingSaveTimerRef.current = null;
      }
    };
  }, [values, userId, draftKey, enabled, autosaveDelay]);

  // Flush pending edits when the form closes / unmounts so last keystrokes are kept.
  useEffect(() => {
    if (enabled) return undefined;

    if (userId && draftKey && hydratedRef.current && !skipSaveRef.current) {
      if (pendingSaveTimerRef.current) {
        window.clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
      saveFormDraft(userId, draftKey, valuesRef.current);
    }

    return undefined;
  }, [enabled, userId, draftKey]);

  useEffect(() => {
    return () => {
      if (pendingSaveTimerRef.current) {
        window.clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
      if (
        prevEnabledRef.current &&
        userId &&
        draftKey &&
        hydratedRef.current &&
        !skipSaveRef.current
      ) {
        saveFormDraft(userId, draftKey, valuesRef.current);
      }
    };
  }, [userId, draftKey]);

  // Flush on background / tab hide so a process kill does not lose the last keystrokes.
  useEffect(() => {
    if (!enabled || !userId || !draftKey) return undefined;

    const flush = () => {
      if (!hydratedRef.current || skipSaveRef.current) return;
      if (pendingSaveTimerRef.current) {
        window.clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
      saveFormDraft(userId, draftKey, valuesRef.current);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [enabled, userId, draftKey]);

  const setValues = useCallback((updater) => {
    setValuesState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const clearDraft = useCallback(() => {
    if (userId && draftKey) {
      if (pendingSaveTimerRef.current) {
        window.clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
      skipSaveRef.current = true;
      clearFormDraft(userId, draftKey);
      setWasRestored(false);
    }
  }, [userId, draftKey]);

  const resetToInitial = useCallback((nextInitial) => {
    if (pendingSaveTimerRef.current) {
      window.clearTimeout(pendingSaveTimerRef.current);
      pendingSaveTimerRef.current = null;
    }
    skipSaveRef.current = true;
    const base = nextInitial ?? initialRef.current;
    setValuesState(base);
    setWasRestored(false);
  }, []);

  return {
    values,
    setValues,
    clearDraft,
    resetToInitial,
    wasRestored,
    hasDraft: isMeaningfulDraftData(values),
    isHydrated: hydratedRef.current,
  };
}
