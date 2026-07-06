import ProfileSectionCard, { ProfileEntryRow } from './ProfileSectionCard';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { GraduationCap } from '../../constants/icons';
import { formatDateRange } from '../../utils/formatDate';

const PREVIEW_COUNT = 2;

export default function EducationSection({ items = [], isOwn, onAdd, onEdit, onDelete }) {
  const preview = items.slice(0, PREVIEW_COUNT);
  const footerLabel =
    items.length > 0 ? `Ver toda la educación (${items.length})` : undefined;

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.education}
      iconTone="education"
      title="Educación"
      isOwn={isOwn}
      onAdd={onAdd}
      isEmpty={!items.length}
      emptyText="Sin formación registrada."
      footerLabel={footerLabel}
    >
      {preview.map((item) => (
        <ProfileEntryRow
          key={item.id}
          title={item.institution}
          subtitle={[item.program, item.specialty].filter(Boolean).join(' · ')}
          meta={[formatDateRange(item.start_date, item.end_date), item.grade].filter(Boolean).join(' · ')}
          entryIcon={GraduationCap}
          entryIconTone="education"
          isOwn={isOwn}
          onEdit={() => onEdit?.(item)}
          onDelete={() => onDelete?.(item.id)}
        />
      ))}
    </ProfileSectionCard>
  );
}
