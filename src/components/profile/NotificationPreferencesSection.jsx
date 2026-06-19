import { useEffect, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import AppIcon from '../common/AppIcon';
import { Save, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
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

function ChipGroup({ label, options, selected = [], onToggle }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const value = option.value ?? option;
          const optionLabel = option.label ?? option;
          const active = selected.includes(value);

          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
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

export default function NotificationPreferencesSection({
  profile,
  isOwn,
  onSavePreferences,
  onSaveNotificationSettings,
  loading = false,
}) {
  const [prefs, setPrefs] = useState(EMPTY_JOB_PREFERENCES);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState('instant');
  const [keywordDraft, setKeywordDraft] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPrefs(normalizeJobPreferences(profile?.job_preferences));
    setNotificationsEnabled(profile?.notifications_enabled !== false);
    setNotificationFrequency(profile?.notification_frequency ?? 'instant');
    setKeywordDraft('');
    setDirty(false);
  }, [profile?.job_preferences, profile?.notifications_enabled, profile?.notification_frequency]);

  if (!isOwn) return null;

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
    await onSaveNotificationSettings?.({
      notifications_enabled: notificationsEnabled,
      notification_frequency: notificationFrequency,
    });
    await onSavePreferences?.(serializeJobPreferences(prefs));
    setDirty(false);
  };

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.preferences}
      iconTone="preferences"
      title="Notificaciones y recomendaciones"
      isEmpty={false}
    >
      <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50/60 p-4 text-left">
        <p className="text-sm font-medium text-primary-900">Recomendaciones personalizadas</p>
        <p className="mt-1.5 text-sm leading-relaxed text-primary-800/90">
          Te avisaremos cuando publiquen ofertas que encajen con tu perfil y preferencias.
        </p>
      </div>

      <div className="space-y-5">
        <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => {
              setNotificationsEnabled(e.target.checked);
              setDirty(true);
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">
              Notificarme cuando existan ofertas relevantes
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Recibirás alertas in-app y push según la frecuencia elegida.
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
          disabled={!notificationsEnabled}
        />

        <ChipGroup
          label="Ubicaciones preferidas"
          options={CITIES.map((city) => ({ value: city, label: city }))}
          selected={prefs.preferred_locations}
          onToggle={(value) => toggle('preferred_locations', value)}
        />

        <ChipGroup
          label="Categorías de interés"
          options={JOB_CATEGORIES.map((category) => ({ value: category, label: category }))}
          selected={prefs.preferred_categories}
          onToggle={(value) => toggle('preferred_categories', value)}
        />

        <ChipGroup
          label="Tipos de empleo"
          options={JOB_TYPES}
          selected={prefs.preferred_job_types}
          onToggle={(value) => toggle('preferred_job_types', value)}
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
        />

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Palabras clave del perfil</p>
          <p className="mb-2 text-xs text-gray-500">
            Mejoran la coincidencia con ofertas (ej. ventas, contabilidad, recepción).
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Añadir palabra clave"
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              className="mb-0"
            />
            <Button type="button" size="sm" variant="secondary" onClick={addKeyword}>
              Añadir
            </Button>
          </div>
          {prefs.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {prefs.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label={`Eliminar ${keyword}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {dirty && (
          <Button type="button" fullWidth loading={loading} onClick={handleSave} className="gap-2">
            <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
            Guardar preferencias
          </Button>
        )}
      </div>
    </ProfileSectionCard>
  );
}
