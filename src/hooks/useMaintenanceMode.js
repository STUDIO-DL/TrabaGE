import { useCallback, useEffect, useMemo, useState } from 'react';
import { maintenanceService } from '../services/maintenance.service';
import { ROLES } from '../constants/roles';
import { useAuth } from './useAuth';

const POLL_MS = 25_000;

const ALLOWED_DURING_MAINTENANCE = [
  '/maintenance',
  '/login',
  '/auth/',
  '/admin',
  '/privacy',
  '/terms',
];

export function isPathAllowedDuringMaintenance(pathname) {
  if (!pathname) return false;
  return ALLOWED_DURING_MAINTENANCE.some((prefix) => {
    if (prefix.endsWith('/')) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

/**
 * Global maintenance status. Realtime + polling. Admins bypass blocking.
 */
export function useMaintenanceMode() {
  const { role, loading: authLoading } = useAuth();
  const [status, setStatus] = useState({
    enabled: false,
    message: maintenanceService.DEFAULT_MESSAGE,
    start_at: null,
    end_at: null,
    is_active: false,
    updated_at: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await maintenanceService.getStatus();
    if (data) setStatus(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = maintenanceService.subscribe((next) => {
      if (next) setStatus(next);
    });
    const intervalId = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  // Local watch: when end_at passes while tab is open, refresh to auto-disable.
  useEffect(() => {
    if (!status.enabled || !status.end_at) return undefined;
    const endMs = new Date(status.end_at).getTime();
    const delay = endMs - Date.now();
    if (delay <= 0) {
      void refresh();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void refresh();
    }, Math.min(delay + 250, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [status.enabled, status.end_at, refresh]);

  const isAdmin = role === ROLES.ADMIN;
  const isActive = Boolean(status.is_active);
  const shouldBlock = isActive && !isAdmin && !authLoading;

  return useMemo(
    () => ({
      status,
      loading,
      isActive,
      isAdmin,
      shouldBlock,
      refresh,
      isPathAllowed: isPathAllowedDuringMaintenance,
    }),
    [status, loading, isActive, isAdmin, shouldBlock, refresh],
  );
}
