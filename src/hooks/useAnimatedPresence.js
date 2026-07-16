import { useEffect, useState } from 'react';

/**
 * Keeps an overlay mounted during a short exit animation after `isOpen` becomes false.
 * Respects prefers-reduced-motion by skipping the delay.
 */
export default function useAnimatedPresence(isOpen, exitMs = 200) {
  const [mounted, setMounted] = useState(isOpen);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setExiting(false);
      return undefined;
    }

    if (!mounted) return undefined;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setMounted(false);
      setExiting(false);
      return undefined;
    }

    setExiting(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, exitMs);

    return () => window.clearTimeout(timer);
  }, [isOpen, mounted, exitMs]);

  return { mounted, exiting };
}
