import { useEffect, useState } from 'react';
import { formatTimeAgo } from '../utils/formatDate';

// Single module-level ticker shared by every <TimeAgo /> instance so we never
// create one interval per card. The interval only runs while at least one
// subscriber is mounted, and is torn down when the last one unmounts.
const TICK_INTERVAL_MS = 60000;
const subscribers = new Set();
let intervalId = null;

function tick() {
  subscribers.forEach((notify) => notify());
}

function subscribe(notify) {
  subscribers.add(notify);
  if (intervalId === null) {
    intervalId = setInterval(tick, TICK_INTERVAL_MS);
  }
  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export function useTimeAgo(date) {
  const [label, setLabel] = useState(() => formatTimeAgo(date));

  useEffect(() => {
    setLabel(formatTimeAgo(date));
    const unsubscribe = subscribe(() => setLabel(formatTimeAgo(date)));
    return unsubscribe;
  }, [date]);

  return label;
}
