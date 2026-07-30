import { useEffect, useState } from 'react';

import AppIcon from '../common/AppIcon';
import Button from '../ui/Button';
import { ICON_SIZES, ShieldCheck } from '../../constants/icons';
import {
  getNotificationGroupsForRole,
  NOTIFICATION_MASTER_CARD,
  NOTIFICATION_SAVED_COPY,
} from '../../constants/notificationPreferences';
import { useNotificationContext } from '../../context/NotificationContext';
import { isOneSignalConfigured } from '../../config/onesignal';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { rolePath } from '../../constants/roles';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { getNotificationsInboxPath } from '../../utils/notificationSetup';
import { supabase } from '../../config/supabase';
import { reportError } from '../../utils/logger';
import {
  getPushDiagnostics,
  getPushDiagnosticUserMessage,
} from '../../utils/pushDiagnostics';

const TEST_PUSH_TITLE = 'TrabaGE · Prueba de notificación';
const TEST_PUSH_BODY =
  'Esta es una notificación push de prueba. Si puedes verla fuera de TrabaGE, el sistema funciona correctamente.';

function PreferenceSwitch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={[
        'relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
        checked ? 'bg-primary-600 shadow-[0_8px_18px_rgba(37,99,235,0.24)]' : 'bg-slate-200',
        disabled ? 'cursor-not-allowed opacity-50' : 'active:scale-95',
      ].join(' ')}
    >
      <span
        className={[
          'block h-6 w-6 rounded-full bg-app-card  transition-transform duration-200 ease-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

function SaveIndicator({ itemKey, savingKey, savedKey }) {
  if (savingKey !== itemKey && savedKey !== itemKey) return null;

  return (
    <span
      className={[
        'rounded-full px-2 py-0.5 text-caption font-semibold transition',
        savingKey === itemKey
          ? 'bg-primary-50 text-primary-700'
          : 'bg-emerald-50 text-emerald-700',
      ].join(' ')}
    >
      {savingKey === itemKey ? NOTIFICATION_SAVED_COPY.saving : NOTIFICATION_SAVED_COPY.saved}
    </span>
  );
}

function PreferenceCard({
  item,
  checked,
  disabled,
  savingKey,
  savedKey,
  onToggle,
}) {
  return (
    <div
      className={[
        'rounded-radius-lg border border-slate-100 bg-app-card/95 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition duration-200',
        disabled ? 'opacity-55 grayscale-[0.15]' : 'hover:-translate-y-0.5 hover:border-primary-100',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-body-small font-semibold text-app-text">{item.title}</h4>
            <SaveIndicator itemKey={item.key} savingKey={savingKey} savedKey={savedKey} />
          </div>
          <p className="mt-1 text-caption leading-relaxed text-app-muted">{item.description}</p>
        </div>
        <PreferenceSwitch
          checked={checked}
          disabled={disabled}
          label={item.title}
          onChange={onToggle}
        />
      </div>
    </div>
  );
}

function PreferenceGroup({
  group,
  preferences,
  disabled,
  savingKey,
  savedKey,
  onTogglePreference,
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-app-card p-4 shadow-[0_18px_46px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-radius-lg bg-primary-50 text-primary-600">
          <AppIcon icon={group.icon} size={ICON_SIZES.default} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-semibold text-app-text">{group.title}</h3>
          <p className="mt-1 text-body-small leading-relaxed text-app-muted">{group.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {group.items.map((item) => (
          <PreferenceCard
            key={item.key}
            item={item}
            checked={preferences[item.key] === true}
            disabled={disabled || savingKey === item.key}
            savingKey={savingKey}
            savedKey={savedKey}
            onToggle={() => onTogglePreference(item.key)}
          />
        ))}
      </div>
    </section>
  );
}

function PreferencesSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-[28px] bg-app-card shadow-[0_12px_30px_rgba(15,23,42,0.04)]" />
      ))}
    </div>
  );
}

export default function NotificationPreferencesPanel({ accountType }) {
  const { user, isPreviewMode, role } = useAuth();
  const { showToast } = useNotificationContext();
  const activeRole = accountType || role;
  const groups = getNotificationGroupsForRole(activeRole);
  const [sendingTest, setSendingTest] = useState(false);
  const {
    preferences,
    setMasterEnabled,
    setPreference,
    status,
    clearPermissionMessage,
  } = useNotificationPreferences(user?.id, { disabled: isPreviewMode, role: activeRole });

  useEffect(() => {
    if (status.permissionMessage === 'granted') {
      showToast(NOTIFICATION_SAVED_COPY.activated, 'success');
      clearPermissionMessage();
      return;
    }

    if (status.permissionMessage === 'denied') {
      showToast(NOTIFICATION_SAVED_COPY.denied, 'info');
      clearPermissionMessage();
    }
  }, [clearPermissionMessage, showToast, status.permissionMessage]);

  const handleMasterToggle = async () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    const { error } = await setMasterEnabled(!status.pushToggleChecked);
    if (error) showToast(getSupabaseErrorMessage(error, 'No se pudieron guardar las preferencias.'), 'error');
  };

  const handleTogglePreference = async (key) => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    if (!status.pushToggleChecked) return;

    const { error } = await setPreference(key, !preferences[key]);
    if (error) showToast(getSupabaseErrorMessage(error, 'No se pudo actualizar la preferencia.'), 'error');
  };

  const handleSendTestNotification = async () => {
    if (!import.meta.env.DEV || isPreviewMode || !user?.id || !status.pushToggleChecked) return;

    setSendingTest(true);
    try {
      const diagnostics = await getPushDiagnostics();
      if (import.meta.env.DEV) {
        console.info('[TrabaGE] push diagnostics', {
          permission: diagnostics.permission,
          subscriptionId: diagnostics.subscriptionId,
          externalId: diagnostics.externalId,
          optedIn: diagnostics.optedIn,
          serviceWorkerActive: diagnostics.serviceWorkerActive,
          serviceWorkerScript: diagnostics.serviceWorkerScript,
          blockers: diagnostics.blockers,
          readyForTestPush: diagnostics.readyForTestPush,
        });
      }

      const blockerMessage = getPushDiagnosticUserMessage(diagnostics);
      if (blockerMessage) {
        showToast(blockerMessage, 'info');
        return;
      }

      const link = getNotificationsInboxPath(rolePath(activeRole, ''));

      // Self notifyUser is blocked by create_notification (no self in-app).
      // Use send_push self-path (same as scripts/test-onesignal-push.mjs).
      const { data: pushResult, error } = await supabase.functions.invoke('send_push', {
        body: {
          recipient_id: user.id,
          title: TEST_PUSH_TITLE,
          body: TEST_PUSH_BODY,
          data: {
            type: 'system_update',
            link,
            test: true,
          },
        },
      });

      if (error || pushResult?.error) {
        reportError(error ?? pushResult?.error, {
          area: 'dev_test_push',
          pushResult,
        });
        showToast(
          'No se pudo enviar la notificación de prueba. Revisa la conexión e inténtalo de nuevo.',
          'error',
        );
        return;
      }

      if (pushResult?.sent > 0) {
        showToast(
          'Push de prueba enviado. Minimiza o cierra la pestaña y comprueba la bandeja del sistema (no solo el toast de TrabaGE).',
          'success',
        );
        return;
      }

      if (pushResult?.skipped > 0) {
        showToast('Push omitido — revisa preferencias y permiso del sistema.', 'info');
        return;
      }

      if (pushResult?.deduped > 0) {
        showToast('Push deduplicado — espera unos minutos o cambia el texto.', 'info');
        return;
      }

      showToast('No se envió el push. Revisa permiso del sistema y suscripción activa.', 'info');
    } catch (error) {
      reportError(error, { area: 'dev_test_push' });
      showToast('No se pudo enviar la notificación de prueba. Inténtalo de nuevo.', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const disabledCategories = !status.pushToggleChecked || status.savingKey === 'push_enabled' || isPreviewMode;

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-primary-100 bg-app-card p-5 shadow-[0_20px_52px_rgba(37,99,235,0.09)]">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-radius-lg bg-primary-600 text-white shadow-[0_12px_26px_rgba(37,99,235,0.25)]">
            <AppIcon icon={NOTIFICATION_MASTER_CARD.icon} size={ICON_SIZES.default} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-body font-semibold text-app-text">{NOTIFICATION_MASTER_CARD.title}</h3>
              <SaveIndicator itemKey="push_enabled" savingKey={status.savingKey} savedKey={status.savedKey} />
            </div>
            <p className="mt-1.5 text-body-small leading-relaxed text-app-muted">
              {NOTIFICATION_MASTER_CARD.description}
            </p>
          </div>
          <PreferenceSwitch
            checked={status.pushToggleChecked}
            disabled={status.loading || status.savingKey === 'push_enabled' || isPreviewMode}
            label={NOTIFICATION_MASTER_CARD.title}
            onChange={handleMasterToggle}
          />
        </div>

        {status.osPermissionDenied ? (
          <div className="mt-4 rounded-radius-lg border border-amber-100 bg-amber-50 px-4 py-3 text-caption leading-relaxed text-warning-800">
            {NOTIFICATION_SAVED_COPY.blocked}
          </div>
        ) : null}

        {!isOneSignalConfigured() ? (
          <div className="mt-4 rounded-radius-lg border border-amber-100 bg-amber-50 px-4 py-3 text-caption leading-relaxed text-warning-800">
            Push del sistema no disponible en este entorno. Configura <code className="font-mono">VITE_ONESIGNAL_APP_ID</code> en <code className="font-mono">.env.local</code> y reinicia el servidor. Las notificaciones in-app seguirán funcionando.
          </div>
        ) : null}

        {import.meta.env.DEV && status.pushToggleChecked ? (
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={sendingTest || isPreviewMode}
              onClick={handleSendTestNotification}
            >
              {sendingTest ? 'Enviando prueba…' : 'Enviar notificación push de prueba'}
            </Button>
          </div>
        ) : null}

        {status.error ? (
          <div className="mt-4 rounded-radius-lg border border-red-100 bg-red-50 px-4 py-3 text-caption leading-relaxed text-error-700">
            {getSupabaseErrorMessage(status.error, 'No se pudieron cargar las preferencias de notificaciones.')}
          </div>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-primary-100 bg-primary-50/70 px-4 py-3">
        <div className="flex gap-3">
          <AppIcon icon={ShieldCheck} size={ICON_SIZES.sm} className="mt-0.5 shrink-0 text-primary-600" />
          <p className="text-caption leading-relaxed text-primary-900">
            {NOTIFICATION_SAVED_COPY.securityAlwaysOn}
          </p>
        </div>
      </div>

      {status.loading ? (
        <PreferencesSkeleton />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <PreferenceGroup
              key={group.id}
              group={group}
              preferences={preferences}
              disabled={disabledCategories}
              savingKey={status.savingKey}
              savedKey={status.savedKey}
              onTogglePreference={handleTogglePreference}
            />
          ))}
        </div>
      )}
    </div>
  );
}
