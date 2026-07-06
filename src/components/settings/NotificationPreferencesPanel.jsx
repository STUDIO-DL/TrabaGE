import { useEffect } from 'react';

import AppIcon from '../common/AppIcon';
import { ICON_SIZES, ShieldCheck } from '../../constants/icons';
import {
  getNotificationGroupsForRole,
  NOTIFICATION_MASTER_CARD,
  NOTIFICATION_SAVED_COPY,
} from '../../constants/notificationPreferences';
import { useNotificationContext } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

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
          'block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
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
        'rounded-full px-2 py-0.5 text-[11px] font-semibold transition',
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
        'rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition duration-200',
        disabled ? 'opacity-55 grayscale-[0.15]' : 'hover:-translate-y-0.5 hover:border-primary-100',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[14px] font-semibold text-slate-950">{item.title}</h4>
            <SaveIndicator itemKey={item.key} savingKey={savingKey} savedKey={savedKey} />
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{item.description}</p>
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
    <section className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-[0_18px_46px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <AppIcon icon={group.icon} size={ICON_SIZES.default} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-bold text-slate-950">{group.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{group.description}</p>
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
        <div key={item} className="h-28 animate-pulse rounded-[28px] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]" />
      ))}
    </div>
  );
}

export default function NotificationPreferencesPanel({ accountType }) {
  const { user, isPreviewMode, role } = useAuth();
  const { showToast } = useNotificationContext();
  const activeRole = accountType || role;
  const groups = getNotificationGroupsForRole(activeRole);
  const {
    preferences,
    setMasterEnabled,
    setPreference,
    status,
    clearPermissionMessage,
  } = useNotificationPreferences(user?.id, { disabled: isPreviewMode });

  useEffect(() => {
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

    const { error } = await setMasterEnabled(!preferences.push_enabled);
    if (error) showToast(getSupabaseErrorMessage(error, 'No se pudieron guardar las preferencias.'), 'error');
  };

  const handleTogglePreference = async (key) => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    if (!preferences.push_enabled) return;

    const { error } = await setPreference(key, !preferences[key]);
    if (error) showToast(getSupabaseErrorMessage(error, 'No se pudo actualizar la preferencia.'), 'error');
  };

  const disabledCategories = !preferences.push_enabled || status.savingKey === 'push_enabled' || isPreviewMode;

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-primary-100 bg-white p-5 shadow-[0_20px_52px_rgba(37,99,235,0.09)]">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-[0_12px_26px_rgba(37,99,235,0.25)]">
            <AppIcon icon={NOTIFICATION_MASTER_CARD.icon} size={ICON_SIZES.default} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[16px] font-bold text-slate-950">{NOTIFICATION_MASTER_CARD.title}</h3>
              <SaveIndicator itemKey="push_enabled" savingKey={status.savingKey} savedKey={status.savedKey} />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
              {NOTIFICATION_MASTER_CARD.description}
            </p>
          </div>
          <PreferenceSwitch
            checked={preferences.push_enabled}
            disabled={status.loading || status.savingKey === 'push_enabled' || isPreviewMode}
            label={NOTIFICATION_MASTER_CARD.title}
            onChange={handleMasterToggle}
          />
        </div>

        {!preferences.push_enabled ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12px] leading-relaxed text-slate-500">
            {NOTIFICATION_SAVED_COPY.permissionRequired}
          </div>
        ) : null}

        {status.error ? (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] leading-relaxed text-red-700">
            {getSupabaseErrorMessage(status.error, 'No se pudieron cargar las preferencias de notificaciones.')}
          </div>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-primary-100 bg-primary-50/70 px-4 py-3">
        <div className="flex gap-3">
          <AppIcon icon={ShieldCheck} size={ICON_SIZES.sm} className="mt-0.5 shrink-0 text-primary-600" />
          <p className="text-[12px] leading-relaxed text-primary-900">
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
