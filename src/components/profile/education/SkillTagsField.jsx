import { useMemo, useState } from 'react';
import AutocompleteInput from '../../ui/AutocompleteInput';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Trash2, ICON_SIZES } from '../../../constants/icons';
import { filterSkillSuggestions } from '../../../constants/skills';
import { normalizeSkillName } from '../../../utils/normalizeSkill';

const MAX_SKILLS = 5;

export default function SkillTagsField({
  label = 'Habilidades',
  value = [],
  onChange,
  error,
  hint = `Máximo ${MAX_SKILLS} habilidades`,
  disabled = false,
}) {
  const [draft, setDraft] = useState('');

  const suggestions = useMemo(
    () => filterSkillSuggestions(draft, value),
    [draft, value],
  );

  const addSkill = (name) => {
    const normalized = normalizeSkillName(name);
    if (!normalized || disabled) return;
    if (value.length >= MAX_SKILLS) return;
    if (value.some((item) => normalizeSkillName(item).toLowerCase() === normalized.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange?.([...value, normalized]);
    setDraft('');
  };

  const removeSkill = (index) => {
    if (disabled) return;
    onChange?.(value.filter((_, itemIndex) => itemIndex !== index));
  };

  const atLimit = value.length >= MAX_SKILLS;

  return (
    <div className="w-full">
      {label && (
        <p className="mb-space-sm block text-label text-app-muted">{label}</p>
      )}

      {value.length > 0 && (
        <ul className="mb-space-sm flex flex-wrap gap-space-sm" aria-label="Habilidades añadidas">
          {value.map((skill, index) => (
            <li key={`${skill}-${index}`} className="max-w-full">
              <span className="inline-flex max-w-full items-center gap-1 rounded-radius-circular border border-app-border bg-app-surface py-1 pl-space-md pr-1 text-body-small text-app-text">
                <span className="min-w-0 truncate">{skill}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-app-subtle transition-colors hover:bg-error-50 hover:text-error-600"
                    aria-label={`Eliminar ${skill}`}
                  >
                    <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!atLimit && !disabled && (
        <div className="flex min-w-0 flex-col gap-space-sm sm:flex-row sm:items-stretch">
          <AutocompleteInput
            className="min-w-0 flex-1"
            value={draft}
            onChange={setDraft}
            onSelect={addSkill}
            suggestions={suggestions}
            placeholder="Escribe una habilidad"
            inputClassName="h-input-md min-h-touch rounded-radius-md border border-app-border bg-app-card px-space-md text-body-small text-app-text outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            listClassName="rounded-radius-md border border-app-border bg-app-card shadow-elevation-2"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 sm:w-auto"
            onClick={() => addSkill(draft)}
          >
            Añadir
          </Button>
        </div>
      )}

      <p className="mt-space-xs text-caption text-app-subtle">
        {value.length}/{MAX_SKILLS}
        {hint ? ` · ${hint}` : ''}
      </p>

      {error && (
        <p className="mt-space-xs text-caption text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
