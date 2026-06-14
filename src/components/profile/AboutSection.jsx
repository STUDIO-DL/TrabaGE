import { useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import Button from '../ui/Button';
import { IconUser } from './ProfileIcons';

const PREVIEW_LENGTH = 180;

export default function AboutSection({ about, isOwn, onSave, saving = false }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(about || '');

  const hasContent = Boolean(about?.trim());
  const needsExpand = hasContent && about.length > PREVIEW_LENGTH;
  const displayText = hasContent && !expanded && needsExpand ? `${about.slice(0, PREVIEW_LENGTH)}…` : about;

  const startEdit = () => {
    setDraft(about || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(about || '');
    setEditing(false);
  };

  const saveEdit = async () => {
    await onSave?.(draft.trim());
    setEditing(false);
  };

  return (
    <ProfileSectionCard
      icon={IconUser}
      title="Sobre mí"
      isOwn={isOwn && !editing}
      onAdd={startEdit}
      addLabel={hasContent ? 'Editar' : 'Añadir'}
      isEmpty={!hasContent && !editing}
      emptyText="Sin descripción."
    >
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Cuéntanos sobre ti…"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" loading={saving} onClick={saveEdit}>
              Guardar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {hasContent && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{displayText}</p>
          )}
          {needsExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {expanded ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </>
      )}
    </ProfileSectionCard>
  );
}
