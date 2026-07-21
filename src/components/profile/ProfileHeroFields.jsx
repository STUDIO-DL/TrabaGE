import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import AppIcon from '../common/AppIcon';
import { Briefcase, MapPin, Pencil, Save, X, ICON_SIZES } from '../../constants/icons';

/** Input hints for editable hero fields — never shown as visible placeholder text to visitors. */
export const EDITOR_HINTS = {
  name: 'Añade tu nombre completo',
  headline: 'Añade tu titular profesional',
  city: 'Añade tu ubicación',
  years: 'Selecciona años de experiencia',
  sector: 'Añade tu sector',
  position: 'Añade tu puesto actual',
  education: 'Selecciona un centro educativo',
};

/** @deprecated Use EDITOR_HINTS */
export const EMPTY = EDITOR_HINTS;

export const YEAR_OPTIONS = Array.from({ length: 51 }, (_, i) => i);

export function formatYearsLabel(years) {
  if (years == null || years === '') return null;
  const n = Number(years);
  if (Number.isNaN(n)) return null;
  if (n === 0) return 'Sin experiencia previa';
  return `${n} ${n === 1 ? 'año' : 'años'} de experiencia`;
}

export function hasYearsExperience(years) {
  return years != null && years !== '';
}

export const EditableHeroField = forwardRef(function EditableHeroField(
  {
    value,
    placeholder,
    isOwn,
    onSave,
    saving,
    as = 'h2',
    inputClassName = '',
    displayClassName = '',
    hideEditButton = false,
  },
  ref,
) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    startEditing: () => {
      if (isOwn) setEditing(true);
    },
  }));

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
    return <Tag className={`text-user-content min-w-0 flex-1 ${displayClassName}`}>{value}</Tag>;
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
          className={`w-full rounded-radius-md border border-app-border bg-app-card px-3 py-2 text-app-text outline-none ring-2 ring-primary-500/30 focus:ring-primary-500 ${inputClassName}`}
          placeholder={placeholder}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={save}
            className="inline-flex items-center gap-1 rounded-radius-md bg-primary-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {!saving && <AppIcon icon={Save} size={ICON_SIZES.sm} className="text-white" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1 rounded-radius-md px-3 py-1 text-xs font-medium text-app-muted hover:text-app-text"
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
      <Tag className={`text-user-content min-w-0 flex-1 ${displayClassName}`}>{value || placeholder}</Tag>
      {!hideEditButton && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-0.5 shrink-0 rounded-radius-sm p-1.5 text-app-muted opacity-80 hover:bg-app-surface hover:opacity-100"
          aria-label="Editar"
        >
          <AppIcon icon={Pencil} size={ICON_SIZES.default} />
        </button>
      )}
    </div>
  );
});

export function EditableHeroSelect({
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
      <p className={`flex items-center gap-1.5 text-caption text-app-muted ${className}`}>
        {Icon && <AppIcon icon={Icon} size={ICON_SIZES.default} className="shrink-0" />}
        {display}
      </p>
    );
  }

  if (editing) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          {Icon && <AppIcon icon={Icon} size={ICON_SIZES.default} className="shrink-0 text-app-muted" />}
          <select
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 rounded-radius-md border border-app-border bg-app-card px-3 py-2 text-sm text-app-text outline-none ring-2 ring-primary-500/30 focus:ring-primary-500"
          >
            <option value="">{placeholder || 'Seleccionar...'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
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
            className="inline-flex items-center gap-1 rounded-radius-md bg-primary-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {!saving && <AppIcon icon={Save} size={ICON_SIZES.sm} className="text-white" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(value ?? '');
              setEditing(false);
            }}
            className="inline-flex items-center gap-1 rounded-radius-md px-3 py-1 text-xs font-medium text-app-muted hover:text-app-text"
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
      <p className={`text-user-content flex min-w-0 flex-1 items-center gap-1.5 text-caption text-app-muted`}>
        {Icon && <AppIcon icon={Icon} size={ICON_SIZES.default} className="shrink-0" />}
        {display}
      </p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-radius-sm p-1.5 text-app-muted opacity-80 hover:bg-app-surface hover:opacity-100"
        aria-label="Editar"
      >
        <AppIcon icon={Pencil} size={ICON_SIZES.sm} />
      </button>
    </div>
  );
}

export function EditableHeroYearsBadge({ value, isOwn, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  if (!isOwn) {
    if (!hasYearsExperience(value)) return null;
    return (
      <li className="inline-flex items-center gap-1.5 rounded-radius-full border border-app-border bg-app-surface px-3 py-1.5 text-caption text-app-muted">
        <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="shrink-0" />
        {formatYearsLabel(value)}
      </li>
    );
  }

  if (editing) {
    return (
      <li className="flex w-full flex-col gap-2 rounded-radius-md border border-app-border bg-app-surface p-3 text-caption sm:w-auto">
        <div className="flex items-center gap-2">
          <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="shrink-0 text-app-muted" />
          <select
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 rounded-radius-md border border-app-border bg-app-card px-2 py-1.5 text-app-text outline-none ring-2 ring-primary-500/30 focus:ring-primary-500"
          >
            <option value="">Seleccionar…</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={String(year)}>
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
            className="inline-flex items-center gap-1 rounded-radius-md bg-primary-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {!saving && <AppIcon icon={Save} size={ICON_SIZES.sm} className="text-white" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(value ?? '');
              setEditing(false);
            }}
            className="inline-flex items-center gap-1 rounded-radius-md px-3 py-1 text-xs font-medium text-app-muted hover:text-app-text"
          >
            <AppIcon icon={X} size={ICON_SIZES.sm} />
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group inline-flex items-center gap-1.5 rounded-radius-full border border-app-border bg-app-surface px-3 py-1.5 text-caption text-app-muted">
      <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="shrink-0" />
      <span>{formatYearsLabel(value)}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded p-0.5 text-app-muted opacity-80 hover:bg-app-surface hover:opacity-100"
        aria-label="Editar años de experiencia"
      >
        <AppIcon icon={Pencil} size={12} />
      </button>
    </li>
  );
}
