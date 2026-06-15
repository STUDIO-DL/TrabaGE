import ProfileSectionCard, { ProfileEntryRow } from './ProfileSectionCard';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { Briefcase } from '../../constants/icons';
import { formatDateRange } from '../../utils/formatDate';

const PREVIEW_COUNT = 2;

export default function ExperienceSection({ items = [], isOwn, onAdd, onEdit, onDelete }) {
  const preview = items.slice(0, PREVIEW_COUNT);
  const footerLabel =
    items.length > 0 ? `Ver toda la experiencia (${items.length})` : undefined;

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.experience}
      iconTone="experience"
      title="Experiencia laboral"
      isOwn={isOwn}
      onAdd={onAdd}
      isEmpty={!items.length}
      emptyText="Sin experiencia registrada."
      footerLabel={footerLabel}
    >
      {preview.map((item) => (
        <ProfileEntryRow
          key={item.id}
          title={item.position}
          subtitle={item.company}
          meta={formatDateRange(item.start_date, item.end_date) || undefined}
          entryIcon={Briefcase}
          entryIconTone="experience"
          isOwn={isOwn}
          onEdit={() => onEdit?.(item)}
          onDelete={() => onDelete?.(item.id)}
        />
      ))}
    </ProfileSectionCard>
  );
}
