import { useMemo, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import AutocompleteInput from '../ui/AutocompleteInput';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Trash2, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { SKILL_SUGGESTIONS, filterSkillSuggestions } from '../../constants/skills';
import { normalizeSkillName } from '../../utils/normalizeSkill';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';

const PREVIEW_COUNT = 8;
const POPULAR_COUNT = 6;

export default function SkillsSection({ items = [], isOwn, onAdd, onDelete }) {
  const [skillName, setSkillName] = useState('');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > PREVIEW_COUNT;
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const footerLabel = hasMore
    ? expanded
      ? 'Ver menos'
      : `Ver todas las habilidades (${items.length})`
    : undefined;

  const existingNames = useMemo(() => items.map((item) => item.name), [items]);

  const suggestions = useMemo(
    () => filterSkillSuggestions(skillName, existingNames),
    [skillName, existingNames],
  );

  const popularSuggestions = useMemo(() => {
    const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
    return SKILL_SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase())).slice(0, POPULAR_COUNT);
  }, [existingNames]);

  const addSkill = async (name) => {
    const normalized = normalizeSkillName(name);
    if (!normalized) return;
    if (existingNames.some((n) => normalizeSkillName(n).toLowerCase() === normalized.toLowerCase())) return;

    setAdding(true);
    await onAdd?.(normalized);
    setSkillName('');
    setAdding(false);
  };

  const handleAdd = () => addSkill(skillName);

  return (
    <ProfileSectionCard
      id="skills"
      icon={PROFILE_SECTION_ICONS.skills}
      iconTone="skills"
      title="Habilidades principales"
      isOwn={isOwn}
      isEmpty={!items.length && !isOwn}
      emptyText={getProfileSectionEmptyCopy('skills', isOwn)}
      footerLabel={footerLabel}
      onFooterClick={hasMore ? () => setExpanded((value) => !value) : undefined}
    >
      <div className="flex flex-wrap gap-2.5">
        {visibleItems.map((item) => (
          <span
            key={item.id}
            className="inline-flex min-h-touch max-w-full items-center gap-1.5 rounded-radius-circular border border-app-border bg-app-surface px-4 py-2 text-body-small text-app-text"
          >
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item.name}</span>
            {isOwn && (
              <button
                type="button"
                onClick={() => onDelete?.(item.id)}
                className="ml-0.5 rounded-radius-sm p-1 text-app-muted hover:bg-error-50 hover:text-error-600"
                aria-label="Eliminar"
              >
                <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
              </button>
            )}
          </span>
        ))}
      </div>

      {isOwn && (
        <div className="mt-4 space-y-3 border-t border-app-divider pt-4">
          <div className="flex gap-2">
            <AutocompleteInput
              value={skillName}
              onChange={setSkillName}
              onSelect={addSkill}
              suggestions={suggestions}
              placeholder="Escribe una habilidad"
              disabled={adding}
            />
            <Button type="button" size="sm" loading={adding} onClick={handleAdd}>
              Añadir
            </Button>
          </div>

          {!skillName.trim() && popularSuggestions.length > 0 && (
            <div>
              <p className="mb-2 text-body-small font-medium text-app-muted">Sugerencias</p>
              <div className="flex flex-wrap gap-2">
                {popularSuggestions.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addSkill(skill)}
                    className="min-h-touch rounded-radius-circular border border-dashed border-app-border bg-app-card px-3.5 py-1.5 text-body-small text-app-muted hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ProfileSectionCard>
  );
}
