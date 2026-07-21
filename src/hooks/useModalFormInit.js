import { useEffect, useRef } from 'react';

/**
 * Runs init() only when a modal/sheet transitions from closed → open.
 * Prevents form resets when parent data refetches while the modal stays open
 * (e.g. after picking a file or background profile sync).
 */
export function useModalFormInit(isOpen, init) {
  const wasOpenRef = useRef(false);
  const initRef = useRef(init);
  initRef.current = init;

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) return;
    initRef.current();
  }, [isOpen]);
}
