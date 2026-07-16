import { useCallback, useEffect, useMemo, useState } from 'react';
import { getJobTypeLabel } from '../constants/jobTypes';
import { getWorkModeLabel } from '../constants/workModes';

const STORAGE_KEY = 'trabage_similar_job_alerts';

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function buildSimilarJobAlertKey(job) {
  if (!job) return '';
  return [job.title, job.city, job.job_type, job.work_mode].filter(Boolean).join('|');
}

export function buildSimilarJobAlertLabel(job) {
  if (!job) return '';
  const parts = [job.title, job.city].filter(Boolean);
  if (job.job_type) parts.push(getJobTypeLabel(job.job_type));
  if (job.work_mode) parts.push(getWorkModeLabel(job.work_mode));
  return parts.join(' · ');
}

/**
 * MVP similar-job alerts stored in localStorage, keyed by userId + job pattern.
 * Ready to swap for a backend `saved_job_alerts` table later.
 */
export function useSimilarJobAlerts(userId, job) {
  const alertKey = useMemo(() => buildSimilarJobAlertKey(job), [job]);
  const alertLabel = useMemo(() => buildSimilarJobAlertLabel(job), [job]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!userId || !alertKey) {
      setEnabled(false);
      return;
    }
    const store = readStore();
    setEnabled(Boolean(store[userId]?.[alertKey]));
  }, [userId, alertKey]);

  const toggle = useCallback(() => {
    if (!userId || !alertKey) return false;

    const store = readStore();
    const userAlerts = { ...(store[userId] || {}) };
    const next = !userAlerts[alertKey];
    userAlerts[alertKey] = next;
    store[userId] = userAlerts;
    writeStore(store);
    setEnabled(next);
    return next;
  }, [userId, alertKey]);

  return { enabled, toggle, alertKey, alertLabel, canUse: Boolean(userId && alertKey) };
}
