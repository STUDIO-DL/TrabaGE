import { useEffect, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Save, X, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';
import { FORM_DRAFT_KEYS } from '../../constants/formDrafts';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';

const PREVIEW_LENGTH = 180;

export default function AboutSection({ about, isOwn, onSave, saving = false }) {
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const [expanded, setExpanded] = useState(false);
  const {
    values: aboutDraft,
    setValues: setAboutDraft,
    clearDraft,
    wasRestored,
  } = useFormDraft({
    draftKey: FORM_DRAFT_KEYS.aboutSection,
    userId: user?.id,
    initialValues: { text: about || '', editing: false },
    enabled: Boolean(user?.id && isOwn),
  });

  const editing = Boolean(aboutDraft.editing);
  const draft = aboutDraft.text ?? '';

  useEffect(() => {
    if (editing || wasRestored) return;
    setAboutDraft((prev) => ({ ...prev, text: about || '', editing: false }));
  }, [about, editing, setAboutDraft, wasRestored]);

  const hasContent = Boolean(about?.trim());
  const needsExpand = hasContent && about.length > PREVIEW_LENGTH;
  const displayText =
    hasContent && !expanded && needsExpand ? `${about.slice(0, PREVIEW_LENGTH)}…` : about;

  const startEdit = () => {
    setAboutDraft({ text: about || '', editing: true });
  };

  const cancelEdit = () => {
    clearDraft();
    setAboutDraft({ text: about || '', editing: false });
  };

  const saveEdit = async () => {
    const result = await onSave?.(draft.trim());
    if (result?.error) return;
    clearDraft();
    setAboutDraft({ text: draft.trim(), editing: false });
  };

  return (
    <ProfileSectionCard
      id="about"
      icon={PROFILE_SECTION_ICONS.about}
      iconTone="about"
      title="Sobre mí"
      isOwn={isOwn && !editing}
      onAdd={startEdit}
      addLabel={hasContent ? 'Editar' : 'Añadir'}
      isEmpty={!hasContent && !editing}
      emptyText={getProfileSectionEmptyCopy('about', isOwn)}
    >
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setAboutDraft((prev) => ({ ...prev, text: e.target.value, editing: true }))}
            rows={5}
            className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Cuéntanos sobre ti…"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" loading={saving} onClick={saveEdit} className="gap-1.5">
              <AppIcon icon={Save} size={ICON_SIZES.sm} className="text-white" />
              Guardar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} className="gap-1.5">
              <AppIcon icon={X} size={ICON_SIZES.sm} />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {hasContent && (
            <p className="text-user-content whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {displayText}
            </p>
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
