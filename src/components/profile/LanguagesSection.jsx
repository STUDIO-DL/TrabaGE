import ProfileSectionCard, { ProfileEntryRow } from './ProfileSectionCard';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';

/** Sidebar-only language management when editing own profile */
export default function LanguagesSection({ items = [], isOwn, onAdd, onEdit, onDelete }) {
  if (!isOwn) return null;

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.language}
      iconTone="language"
      title="Idiomas"
      isOwn={isOwn}
      onAdd={onAdd}
      isEmpty={!items.length}
      emptyText={getProfileSectionEmptyCopy('languages', isOwn)}
    >
      <div>
        {items.map((item) => (
          <ProfileEntryRow
            key={item.id}
            title={item.language}
            subtitle={item.level || 'Nivel no especificado'}
            isOwn={isOwn}
            onEdit={() => onEdit?.(item)}
            onDelete={() => onDelete?.(item.id)}
          />
        ))}
      </div>
    </ProfileSectionCard>
  );
}
