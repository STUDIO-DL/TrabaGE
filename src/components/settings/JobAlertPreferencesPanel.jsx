import { useEffect, useState } from 'react';

import AppIcon from '../common/AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Save, ICON_SIZES } from '../../constants/icons';
import { CITIES } from '../../constants/cities';
import { JOB_TYPES } from '../../constants/jobTypes';
import {
  AVAILABILITY_OPTIONS,
  EXPERIENCE_LEVELS,
  JOB_CATEGORIES,
  NOTIFICATION_FREQUENCIES,
} from '../../constants/recommendationPreferences';
import {
  EMPTY_JOB_PREFERENCES,
  normalizeJobPreferences,
  serializeJobPreferences,
} from '../../constants/jobPreferences';
import { useAuth } from '../../hooks/useAuth';
import { useCandidateProfile } from '../../hooks/useCandidateProfile';
import { useNotificationContext } from '../../context/NotificationContext';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

function ChipGroup({ label, options, selected = [], onToggle, disabled = false }) {
  return (
    <div>
      <p className="mb-space-sm text-body-small font-medium text-app-text">{label}</p>
      <div className="flex flex-wrap gap-space-sm">
        {options.map((option) => {
          const value = option.value ?? option;
          const optionLabel = option.label ?? option;
          const active = selected.includes(value);

          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(value)}
              className={[
                'rounded-radius-sm border px-space-sm py-1.5 text-caption font-medium transition-colors',
                active
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-app-border bg-app-card text-app-muted hover:border-app-muted/60',
                disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function JobAlertPreferencesPanel() {
  const { isPreviewMode } = useAuth();
  const { profile, updateBasicInfo } = useCandidateProfile();
  const { showToast, showErrorToast } = useNotificationContext();

  const WORK_MODE_OPTIONS = [
    { value: 'onsite', label: 'Presencial' },
    { value: 'remote', label: 'Remoto' },
    { value: 'hybrid', label: 'Híbrido' },
  ];

  const [prefs, setPrefs] = useState(EMPTY_JOB_PREFERENCES);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState('instant');
  const [keywordDraft, setKeywordDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(normalizeJobPreferences(profile?.job_preferences));
    setNotificationsEnabled(profile?.notifications_enabled !== false);
    setNotificationFrequency(profile?.notification_frequency ?? 'instant');
    setKeywordDraft('');
    setDirty(false);
  }, [profile?.job_preferences, profile?.notifications_enabled, profile?.notification_frequency]);

  const toggle = (field, value) => {
    setPrefs((current) => {
      const list = current[field];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...current, [field]: next };
    });
    setDirty(true);
  };

  const addKeyword = () => {
    const trimmed = keywordDraft.trim();
    if (!trimmed || prefs.keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) return;
    setPrefs((current) => ({ ...current, keywords: [...current.keywords, trimmed] }));
    setKeywordDraft('');
    setDirty(true);
  };

  const removeKeyword = (keyword) => {
    setPrefs((current) => ({
      ...current,
      keywords: current.keywords.filter((k) => k !== keyword),
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    setSaving(true);
    const { error: settingsError } = await updateBasicInfo({
      notifications_enabled: notificationsEnabled,
      notification_frequency: notificationFrequency,
    });
    if (settingsError) {
      setSaving(false);
      showErrorToast(settingsError, 'settings');
      return;
    }

    const { error: prefsError } = await updateBasicInfo({
      job_preferences: serializeJobPreferences(prefs),
    });
    setSaving(false);

    if (prefsError) {
      showErrorToast(prefsError, 'settings');
      return;
    }

    showToast('Preferencias de alertas guardadas', 'success');
    setDirty(false);
  };

  return (
    <section className="surface-card p-space-md sm:p-space-lg">
      <div className="mb-space-md">
        <h3 className="text-body font-semibold text-app-text">Alertas de empleo</h3>
        <p className="mt-space-xs text-body-small leading-relaxed text-app-muted">
          Configura cuándo y dónde quieres recibir avisos sobre ofertas relevantes.
        </p>
      </div>

      <div className="mb-space-md rounded-radius-md border border-primary-100 bg-primary-50/60 p-space-md text-left">
        <p className="text-body-small font-medium text-primary-900">Recomendaciones personalizadas</p>
        <p className="mt-space-xs text-body-small leading-relaxed text-primary-800/90">
          Te avisaremos cuando publiquen ofertas que encajen con tu perfil y preferencias.
        </p>
      </div>

      <div className="space-y-5">
        <label className="flex items-start gap-space-sm rounded-radius-md border border-app-border p-space-md">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            disabled={isPreviewMode}
            onChange={(e) => {
              setNotificationsEnabled(e.target.checked);
              setDirty(true);
            }}
            className="mt-0.5 h-4 w-4 rounded border-app-border text-primary-600"
          />
          <span>
            <span className="block text-body-small font-medium text-app-text">
              Notificarme cuando existan ofertas relevantes
            </span>
            <span className="mt-space-xs block text-caption text-app-muted">
              Recibirás alertas in-app y push según tus preferencias de notificaciones y la frecuencia elegida.
            </span>
          </span>
        </label>

        <Select
          label="Frecuencia de notificaciones"
          value={notificationFrequency}
          onChange={(e) => {
            setNotificationFrequency(e.target.value);
            setDirty(true);
          }}
          options={NOTIFICATION_FREQUENCIES}
          disabled={!notificationsEnabled || isPreviewMode}
        />

        <ChipGroup
          label="Ubicaciones preferidas"
          options={CITIES.map((city) => ({ value: city, label: city }))}
          selected={prefs.preferred_locations}
          onToggle={(value) => toggle('preferred_locations', value)}
          disabled={isPreviewMode}
        />

        <ChipGroup
          label="Categorías de interés"
          options={JOB_CATEGORIES.map((category) => ({ value: category, label: category }))}
          selected={prefs.preferred_categories}
          onToggle={(value) => toggle('preferred_categories', value)}
          disabled={isPreviewMode}
        />

        <ChipGroup
          label="Tipos de empleo"
          options={JOB_TYPES}
          selected={prefs.preferred_job_types}
          onToggle={(value) => toggle('preferred_job_types', value)}
          disabled={isPreviewMode}
        />

        <ChipGroup
          label="Modalidad de trabajo"
          options={WORK_MODE_OPTIONS}
          selected={prefs.preferred_work_modes}
          onToggle={(value) => toggle('preferred_work_modes', value)}
          disabled={isPreviewMode}
        />

        <Select
          label="Nivel de experiencia"
          value={prefs.experience_level ?? ''}
          onChange={(e) => {
            setPrefs((current) => ({
              ...current,
              experience_level: e.target.value || null,
            }));
            setDirty(true);
          }}
          options={[
            { value: '', label: 'Seleccionar' },
            ...EXPERIENCE_LEVELS,
          ]}
          disabled={isPreviewMode}
        />

        <Input
          label="Salario esperado (opcional)"
          type="number"
          min="0"
          placeholder="Ej. 800000"
          value={prefs.expected_salary ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            setPrefs((current) => ({
              ...current,
              expected_salary: value === '' ? null : Number(value),
            }));
            setDirty(true);
          }}
          disabled={isPreviewMode}
        />

        <Select
          label="Disponibilidad"
          value={prefs.availability ?? ''}
          onChange={(e) => {
            setPrefs((current) => ({
              ...current,
              availability: e.target.value || null,
            }));
            setDirty(true);
          }}
          options={[
            { value: '', label: 'Seleccionar' },
            ...AVAILABILITY_OPTIONS,
          ]}
          disabled={isPreviewMode}
        />

        <div>
          <p className="mb-space-sm text-body-small font-medium text-app-text">Palabras clave del perfil</p>
          <p className="mb-space-sm text-caption text-app-muted">
            Mejoran la coincidencia con ofertas (ej. ventas, contabilidad, recepción).
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Añadir palabra clave"
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              className="mb-0"
              disabled={isPreviewMode}
            />
            <Button type="button" size="sm" variant="secondary" onClick={addKeyword} disabled={isPreviewMode}>
              Añadir
            </Button>
          </div>
          {prefs.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {prefs.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 rounded-radius-sm border border-app-border bg-app-surface px-space-sm py-1 text-caption text-app-text"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="text-app-subtle hover:text-error-600"
                    aria-label={`Eliminar ${keyword}`}
                    disabled={isPreviewMode}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {dirty && (
          <Button
            type="button"
            fullWidth
            loading={saving}
            onClick={handleSave}
            disabled={isPreviewMode}
            className="gap-2"
          >
            <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
            Guardar preferencias
          </Button>
        )}
      </div>
    </section>
  );
}
