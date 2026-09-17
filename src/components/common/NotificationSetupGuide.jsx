import { useEffect, useState } from 'react';

import AppIcon from './AppIcon';
import Button from '../ui/Button';
import { Bell, Download, X, ICON_SIZES } from '../../constants/icons';
import { NOTIFICATION_PERMISSION_STATUS } from '../../constants/notificationPreferences';
import { isPushSupported, isWebPushConfigured } from '../../config/webPush';
import { useAuth } from '../../hooks/useAuth';
import { isPwaInstalled } from '../../hooks/useInstallPrompt';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import {
  getOsPushPermissionStatus,
  isOsPushPermissionDenied,
  usePushPermissionActions,
} from '../../hooks/usePushPermission';
import { ROLES } from '../../constants/roles';
import { iosNeedsHomeScreenForPush } from '../../utils/deviceHints';
import {
  isHiddenPushPromptRoute,
  shouldShowPushPermissionPrompt,
  wasPushPromptDismissedRecently,
} from '../../utils/pushPromptVisibility';

const DISMISS_KEY = 'trabage_notification_setup_guide_at';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 4500;

function readTimestamp(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function wasDismissedRecently() {
  const dismissedAt = readTimestamp(DISMISS_KEY);
  if (!dismissedAt) return false;
  return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
}

function isPushPromptLikelyVisible({
  loading,
  isAuthenticated,
  isPreviewMode,
  userId,
  role,
  setupComplete,
  prefsLoading,
  pushEnabled,
}) {
  return shouldShowPushPermissionPrompt({
    loading,
    isAuthenticated,
    isPreviewMode,
    userId,
    role,
    setupComplete,
    prefsLoading,
    pushEnabled,
    osPermission: getOsPushPermissionStatus(),
    isConfigured: isWebPushConfigured(),
    isSupported: isPushSupported(),
    dismissedRecently: wasPushPromptDismissedRecently(),
    hiddenRoute: typeof window !== 'undefined' && isHiddenPushPromptRoute(window.location.pathname),
  });
}

/**
 * Soft post-login guide: notifications + optional install.
 * Hidden while the primary push prompt is showing; cooldown avoids nagging.
 */
export default function NotificationSetupGuide() {
  const { user, isAuthenticated, isPreviewMode, setupComplete, role, loading } = useAuth();
  const { preferences, setMasterEnabled, status } = useNotificationPreferences(user?.id, {
    disabled: isPreviewMode,
    role,
  });
  const { requestPermission, getPermissionStatus } = usePushPermissionActions();
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);

  const thisDeviceGranted = getPermissionStatus() === NOTIFICATION_PERMISSION_STATUS.GRANTED;
  const pushReady = preferences.push_enabled === true && thisDeviceGranted;
  const needsPushStep = !pushReady && !isOsPushPermissionDenied() && isPushSupported() && isWebPushConfigured();
  // Installing is only required for iOS Safari Web Push. Chrome/Android/desktop work in the tab.
  const showInstallInGuide = iosNeedsHomeScreenForPush();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    let timerId = null;

    const evaluate = () => {
      if (cancelled) return;

      if (
        loading ||
        !isAuthenticated ||
        isPreviewMode ||
        !user?.id ||
        role === ROLES.ADMIN ||
        !setupComplete ||
        status.loading ||
        wasDismissedRecently() ||
        isHiddenPushPromptRoute(window.location.pathname) ||
        (!needsPushStep && !showInstallInGuide)
      ) {
        setVisible(false);
        return;
      }

      if (
        isPushPromptLikelyVisible({
          loading,
          isAuthenticated,
          isPreviewMode,
          userId: user?.id,
          role,
          setupComplete,
          prefsLoading: status.loading,
          pushEnabled: preferences.push_enabled,
          permissionStatus: preferences.permission_status,
        })
      ) {
        setVisible(false);
        return;
      }

      timerId = window.setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, SHOW_DELAY_MS);
    };

    evaluate();
    window.addEventListener('popstate', evaluate);
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
      window.removeEventListener('popstate', evaluate);
    };
  }, [
    isAuthenticated,
    isPreviewMode,
    loading,
    needsPushStep,
    preferences.permission_status,
    preferences.push_enabled,
    role,
    setupComplete,
    showInstallInGuide,
    status.loading,
    user?.id,
  ]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore.
    }
    setVisible(false);
  };

  const activateNotifications = async () => {
    setActivating(true);
    try {
      const granted =
        getPermissionStatus() === NOTIFICATION_PERMISSION_STATUS.GRANTED ||
        (await requestPermission());
      if (granted) {
        void setMasterEnabled(true);
      }
      if (!showInstallInGuide || isPwaInstalled()) {
        dismiss();
      }
    } finally {
      setActivating(false);
    }
  };

  if (!visible || (!needsPushStep && !showInstallInGuide)) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-20 left-0 right-0 z-[65] flex justify-center px-4 sm:bottom-6"
      role="region"
      aria-label="Mejora tu experiencia en TrabaGE"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-app-border bg-app-card/95 p-4 shadow-elevation-2 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-semibold text-app-text">Para no perderte nada</p>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-app-subtle transition-colors hover:bg-app-surface hover:text-app-muted"
            aria-label="Cerrar"
          >
            <AppIcon icon={X} size={ICON_SIZES.sm} />
          </button>
        </div>

        <ol className="mt-3 space-y-3">
          {needsPushStep ? (
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <AppIcon icon={Bell} size={ICON_SIZES.sm} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-medium text-app-text">Paso 1</p>
                <p className="mt-0.5 text-caption leading-relaxed text-app-subtle">
                  Activa las notificaciones para recibir mensajes, ofertas de empleo y novedades
                  importantes. No hace falta instalar la app.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 !rounded-lg !px-3 !py-1.5 text-caption"
                  onClick={activateNotifications}
                  disabled={activating}
                >
                  {activating ? 'Activando…' : 'Activar avisos'}
                </Button>
              </div>
            </li>
          ) : null}

          {showInstallInGuide ? (
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <AppIcon icon={Download} size={ICON_SIZES.sm} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-medium text-app-text">
                  {needsPushStep ? 'Paso 2' : 'Recomendado'}
                </p>
                <p className="mt-0.5 text-caption leading-relaxed text-app-subtle">
                  En iPhone, añade TrabaGE a la pantalla de inicio desde Safari (Compartir → Añadir
                  a pantalla de inicio) para poder recibir avisos con Safari cerrado.
                </p>
              </div>
            </li>
          ) : null}
        </ol>

        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="!rounded-lg !px-3 !py-1.5 text-caption"
            onClick={dismiss}
          >
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}
