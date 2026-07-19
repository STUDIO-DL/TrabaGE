import { useEffect, useState } from 'react';

import AppIcon from './AppIcon';
import Button from '../ui/Button';
import { Bell, X, ICON_SIZES } from '../../constants/icons';
import { NOTIFICATION_PERMISSION_STATUS } from '../../constants/notificationPreferences';
import { isOneSignalConfigured } from '../../config/onesignal';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { isOsPushPermissionDenied } from '../../hooks/usePushPermission';
import { ROLES } from '../../constants/roles';

const DISMISS_KEY = 'trabage_push_prompt_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function shouldHideOnRoute(pathname) {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/admin')
  );
}

export default function PushPermissionPrompt() {
  const { user, isAuthenticated, isPreviewMode, setupComplete, role, loading } = useAuth();
  const { preferences, setMasterEnabled, status } = useNotificationPreferences(user?.id, {
    disabled: isPreviewMode,
  });
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const evaluate = () => {
      if (
        loading ||
        !isAuthenticated ||
        isPreviewMode ||
        !user?.id ||
        role === ROLES.ADMIN ||
        !setupComplete ||
        !isOneSignalConfigured() ||
        isOsPushPermissionDenied() ||
        status.loading ||
        preferences.push_enabled ||
        preferences.permission_status === NOTIFICATION_PERMISSION_STATUS.GRANTED ||
        wasDismissedRecently() ||
        shouldHideOnRoute(window.location.pathname)
      ) {
        setVisible(false);
        return;
      }

      setVisible(true);
    };

    evaluate();
    window.addEventListener('popstate', evaluate);
    return () => window.removeEventListener('popstate', evaluate);
  }, [
    isAuthenticated,
    isPreviewMode,
    loading,
    preferences.permission_status,
    preferences.push_enabled,
    role,
    setupComplete,
    status.loading,
    user?.id,
  ]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures.
    }
    setVisible(false);
  };

  const activate = async () => {
    setActivating(true);
    try {
      const { error } = await setMasterEnabled(true);
      if (!error) {
        setVisible(false);
      }
    } finally {
      setActivating(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-36 left-0 right-0 z-[75] flex justify-center px-4 sm:bottom-24"
      role="region"
      aria-label="Activar notificaciones push"
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-primary-100 bg-white/95 p-4 shadow-[0_18px_46px_rgba(37,99,235,0.16)] backdrop-blur-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]">
          <AppIcon icon={Bell} size={ICON_SIZES.sm} strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-slate-950">Activa las notificaciones</p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            Recibe avisos con sonido en la bandeja del sistema sobre ofertas, postulaciones y novedades de cuentas que sigues.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="!rounded-lg !px-3 !py-1.5 text-caption"
              onClick={activate}
              disabled={activating || status.savingKey === 'push_enabled'}
            >
              {activating ? 'Activando…' : 'Activar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="!rounded-lg !px-3 !py-1.5 text-caption"
              onClick={dismiss}
              disabled={activating}
            >
              Ahora no
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          aria-label="Cerrar"
        >
          <AppIcon icon={X} size={ICON_SIZES.sm} />
        </button>
      </div>
    </div>
  );
}
