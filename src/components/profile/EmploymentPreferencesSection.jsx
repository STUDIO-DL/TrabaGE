import { useEffect, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import Input from '../ui/Input';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Save, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { CITIES } from '../../constants/cities';
import { JOB_TYPES } from '../../constants/jobTypes';
import { SECTORS } from '../../constants/sectors';
import { EMPTY_JOB_PREFERENCES, normalizeJobPreferences } from '../../constants/jobPreferences';

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

export default function EmploymentPreferencesSection({
  jobPreferences,
  isOwn,
  onSave,
  loading = false,
}) {
  const [prefs, setPrefs] = useState(EMPTY_JOB_PREFERENCES);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPrefs(normalizeJobPreferences(jobPreferences));
    setKeywordDraft('');
    setDirty(false);
  }, [jobPreferences]);

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
    await onSave?.(normalizeJobPreferences(prefs));
    setDirty(false);
  };

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.preferences}
      iconTone="preferences"
      title="Preferencias de empleo"
      isEmpty={false}
    >
      <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50/60 p-4 text-left">
        <p className="text-sm font-medium text-primary-900">¿Para qué sirven?</p>
        <p className="mt-1.5 text-sm leading-relaxed text-primary-800/90">
          Indícanos qué tipo de empleo te interesa. Usaremos estas preferencias para recomendarte
          ofertas en la página de Empleos, sin que tengas que buscar manualmente cada vez.
        </p>
      </div>

      <div className="space-y-5">
        <ChipGroup
          label="Ciudades preferidas"
          options={CITIES.map((city) => ({ value: city, label: city }))}
          selected={prefs.preferred_cities}
          onToggle={(value) => toggle('preferred_cities', value)}
        />

        <ChipGroup
          label="Tipos de empleo"
          options={JOB_TYPES}
          selected={prefs.preferred_job_types}
          onToggle={(value) => toggle('preferred_job_types', value)}
        />

        <ChipGroup
          label="Sectores de interés"
          options={SECTORS.map((sector) => ({ value: sector, label: sector }))}
          selected={prefs.preferred_sectors}
          onToggle={(value) => toggle('preferred_sectors', value)}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Palabras clave</p>
          <p className="mb-2 text-xs text-gray-500">
            Puestos, áreas o temas que te gustaría encontrar (ej. ventas, contabilidad, recepción).
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
