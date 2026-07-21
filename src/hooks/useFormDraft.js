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
      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'B',location:'useFormDraft.js:autosave',message:'autosave fired',data:{draftKey,enabled},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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

  const setValues = useCallback((updater) => {
    setValuesState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const clearDraft = useCallback(() => {
    if (userId && draftKey) {
      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'B',location:'useFormDraft.js:clearDraft',message:'clearDraft called',data:{draftKey,hadPendingTimer:pendingSaveTimerRef.current!=null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (pendingSaveTimerRef.current) {
        window.clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
      skipSaveRef.current = true;
      clearFormDraft(userId, draftKey);
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
  }, []);

  return {
    values,
    setValues,
    clearDraft,
    resetToInitial,
    isHydrated: hydratedRef.current,
  };
}
