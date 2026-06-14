import { useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { IconSparkles } from './ProfileIcons';

const PREVIEW_COUNT = 8;

export default function SkillsSection({ items = [], isOwn, onAdd, onDelete }) {
  const [skillName, setSkillName] = useState('');
  const [adding, setAdding] = useState(false);
  const preview = items.slice(0, PREVIEW_COUNT);
  const footerLabel =
    items.length > 0 ? `Ver todas las habilidades (${items.length})` : undefined;

  const handleAdd = async () => {
    if (!skillName.trim()) return;
    setAdding(true);
    await onAdd?.(skillName.trim());
    setSkillName('');
    setAdding(false);
  };

  return (
    <ProfileSectionCard
      icon={IconSparkles}
      title="Habilidades principales"
      isOwn={isOwn}
      isEmpty={!items.length && !isOwn}
      emptyText="Sin habilidades registradas."
      footerLabel={footerLabel}
    >
      <div className="flex flex-wrap gap-2">
        {preview.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-sm text-gray-700"
          >
            {item.name}
            {isOwn && (
              <button
                type="button"
                onClick={() => onDelete?.(item.id)}
                className="ml-0.5 text-gray-400 hover:text-red-500"
                aria-label="Eliminar"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {isOwn && (
        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
          <Input
            placeholder="Añadir habilidad"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          />
          <Button type="button" size="sm" loading={adding} onClick={handleAdd}>
            Añadir
          </Button>
        </div>
      )}
    </ProfileSectionCard>
  );
}
