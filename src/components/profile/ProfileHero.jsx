import { useEffect, useRef, useState } from 'react';
import UserAvatar from '../common/UserAvatar';
import AppIcon from '../common/AppIcon';
import { Briefcase, Camera, MapPin, Pencil, Save, X, ICON_SIZES } from '../../constants/icons';
import { CITIES } from '../../constants/cities';

const EMPTY = {
  name: 'Nombre no especificado',
  headline: 'Titular no especificado',
  city: 'Ubicación no especificada',
  years: 'Años de experiencia no especificados',
};

const YEAR_OPTIONS = Array.from({ length: 51 }, (_, i) => i);

function formatYearsLabel(years) {
  if (years == null || years === '') return EMPTY.years;
  const n = Number(years);
  if (Number.isNaN(n)) return EMPTY.years;
  if (n === 0) return 'Sin experiencia previa';
  return `${n} ${n === 1 ? 'año' : 'años'} de experiencia`;
}

function hasYearsExperience(years) {
  return years != null && years !== '';
}

function EditableHeroField({
  value,
  placeholder,
  isOwn,
  onSave,
  saving,
  as = 'h2',
  inputClassName = '',
  displayClassName = '',
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onSave?.(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  const Tag = as;

  if (!isOwn) {
    if (!value?.trim()) return null;
    return <Tag className={displayClassName}>{value}</Tag>;
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          className={`w-full rounded-lg border-0 bg-white/15 px-3 py-2 text-white placeholder-blue-200 outline-none ring-2 ring-white/30 ${inputClassName}`}
          placeholder={placeholder}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={save}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-primary-700 disabled:opacity-50"
          >
            {!saving && <AppIcon icon={Save} size={ICON_SIZES.sm} className="text-primary-700" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-blue-100 hover:text-white"
          >
            <AppIcon icon={X} size={ICON_SIZES.sm} />
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <Tag className={`min-w-0 flex-1 ${displayClassName}`}>{value || placeholder}</Tag>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-1 shrink-0 rounded-lg p-1.5 text-blue-100 opacity-80 hover:bg-white/10 hover:opacity-100"
        aria-label="Editar"
      >
        <AppIcon icon={Pencil} size={ICON_SIZES.default} />
      </button>
    </div>
  );
}

function EditableHeroSelect({
  value,
  placeholder,
  isOwn,
  onSave,
  saving,
  options,
  formatDisplay,
  icon: Icon,
  className = '',
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  const display = formatDisplay(value);

  if (!isOwn) {
    if (!value) return null;
    return (
      <p className={`flex items-center gap-1.5 text-sm text-blue-100 ${className}`}>
        {Icon && <AppIcon icon={Icon} size={ICON_SIZES.default} className="shrink-0" />}
        {display}
      </p>
    );
  }

  if (editing) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          {Icon && <AppIcon icon={Icon} size={ICON_SIZES.default} className="shrink-0 text-blue-100" />}
          <select
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border-0 bg-white/15 px-3 py-2 text-sm text-white outline-none ring-2 ring-white/30"
          >
            <option value="" className="text-gray-900">
              {placeholder || 'Seleccionar...'}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-gray-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || draft === ''}
            onClick={async () => {
              await onSave?.(draft);
              setEditing(false);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-primary-700 disabled:opacity-50"
          >
            {!saving && <AppIcon icon={Save} size={ICON_SIZES.sm} className="text-primary-700" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(value ?? '');
              setEditing(false);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-blue-100 hover:text-white"
          >
            <AppIcon icon={X} size={ICON_SIZES.sm} />
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-2 ${className}`}>
      <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-blue-100">
        {Icon && <AppIcon icon={Icon} size={ICON_SIZES.default} className="shrink-0" />}
        {display}
      </p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-lg p-1.5 text-blue-100 opacity-80 hover:bg-white/10 hover:opacity-100"
        aria-label="Editar"
      >
        <AppIcon icon={Pencil} size={ICON_SIZES.sm} />
      </button>
    </div>
  );
}

function EditableHeroYearsBadge({ value, isOwn, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  if (!isOwn) {
    if (!hasYearsExperience(value)) return null;
    return (
      <li className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm">
        <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="shrink-0" />
        {formatYearsLabel(value)}
      </li>
    );
  }

  if (editing) {
    return (
      <li className="flex w-full flex-col gap-2 rounded-xl bg-white/10 p-3 text-xs backdrop-blur-sm sm:w-auto">
        <div className="flex items-center gap-2">
          <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="shrink-0" />
          <select
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border-0 bg-white/15 px-2 py-1.5 text-white outline-none ring-2 ring-white/30"
          >
            <option value="" className="text-gray-900">
              Seleccionar…
            </option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={String(year)} className="text-gray-900">
                {year === 0 ? 'Sin experiencia previa' : `${year} ${year === 1 ? 'año' : 'años'}`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || draft === ''}
            onClick={async () => {
              await onSave?.(Number(draft));
              setEditing(false);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-primary-700 disabled:opacity-50"
          >
            {!saving && <AppIcon icon={Save} size={ICON_SIZES.sm} className="text-primary-700" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(value ?? '');
              setEditing(false);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-blue-100 hover:text-white"
          >
            <AppIcon icon={X} size={ICON_SIZES.sm} />
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm">
      <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="shrink-0" />
      <span>{formatYearsLabel(value)}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded p-0.5 text-blue-100 opacity-80 hover:bg-white/10 hover:opacity-100"
        aria-label="Editar años de experiencia"
      >
        <AppIcon icon={Pencil} size={12} />
      </button>
    </li>
  );
}

export default function ProfileHero({
  profile,
  isOwn = false,
  onAvatarChange,
  avatarLoading = false,
  onSaveField,
  savingField,
}) {
  const inputRef = useRef(null);

  const cityOptions = CITIES.map((city) => ({ value: city, label: city }));

  const showYearsBadge = hasYearsExperience(profile?.years_experience) || isOwn;

  return (
    <section className="profile-hero relative overflow-hidden px-4 pb-8 pt-6 text-white">
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-end">
        <div className="relative shrink-0">
          <UserAvatar
            src={profile?.avatar_path}
            alt={profile?.full_name}
            size="xl"
            className="border-white/30 ring-4 ring-white/20"
          />
          {isOwn && onAvatarChange && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAvatarChange(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={avatarLoading}
                onClick={() => inputRef.current?.click()}
                aria-label="Cambiar foto de perfil"
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-700 shadow disabled:opacity-60"
              >
                {avatarLoading ? (
                  <span className="text-xs font-medium">…</span>
                ) : (
                  <AppIcon icon={Camera} size={ICON_SIZES.default} />
                )}
              </button>
              <p className="absolute -bottom-6 left-0 whitespace-nowrap text-[10px] text-white/75">
                Max 2 MB
              </p>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <EditableHeroField
            as="h2"
            value={profile?.full_name}
            placeholder={EMPTY.name}
            isOwn={isOwn}
            saving={savingField === 'full_name'}
            onSave={(v) => onSaveField?.('full_name', v)}
            displayClassName="text-2xl font-bold leading-tight sm:text-3xl"
            inputClassName="text-xl sm:text-2xl font-bold"
          />

          <div className="mt-1">
            <EditableHeroField
              as="p"
              value={profile?.headline}
              placeholder={EMPTY.headline}
              isOwn={isOwn}
              saving={savingField === 'headline'}
              onSave={(v) => onSaveField?.('headline', v)}
              displayClassName="text-base text-blue-100 sm:text-lg"
              inputClassName="text-base"
            />
          </div>

          <div className="mt-2">
            <EditableHeroSelect
              value={profile?.city || ''}
              placeholder={EMPTY.city}
              isOwn={isOwn}
              saving={savingField === 'city'}
              onSave={(v) => onSaveField?.('city', v)}
              options={cityOptions}
              formatDisplay={(v) => v || EMPTY.city}
              icon={MapPin}
            />
          </div>

          {showYearsBadge && (
            <ul className="mt-4 flex flex-wrap gap-2">
              <EditableHeroYearsBadge
                value={profile?.years_experience}
                isOwn={isOwn}
                saving={savingField === 'years_experience'}
                onSave={(v) => onSaveField?.('years_experience', v)}
              />
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
