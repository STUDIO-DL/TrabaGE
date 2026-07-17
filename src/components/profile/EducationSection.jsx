import ProfileSectionCard, { ProfileEntryRow } from './ProfileSectionCard';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { GraduationCap } from '../../constants/icons';
import { formatDateRange } from '../../utils/formatDate';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';

const PREVIEW_COUNT = 2;

function buildEducationMeta(item) {
  const dateRange = formatDateRange(
    item.start_date,
    item.is_current ? null : item.end_date,
  );
  const extras = [item.grade, item.skills?.length ? `${item.skills.length} habilidades` : null]
    .filter(Boolean)
    .join(' · ');
  return [dateRange, extras].filter(Boolean).join(' · ');
}

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
      emptyText={getProfileSectionEmptyCopy('education', isOwn)}
      footerLabel={footerLabel}
    >
      {preview.map((item) => (
        <ProfileEntryRow
          key={item.id}
          title={item.institution}
          subtitle={[item.program, item.specialty].filter(Boolean).join(' · ')}
          meta={buildEducationMeta(item)}
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
