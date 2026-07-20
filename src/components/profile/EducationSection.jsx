import { useState } from 'react';
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
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > PREVIEW_COUNT;
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const footerLabel = hasMore
    ? expanded
      ? 'Ver menos'
      : `Ver toda la educación (${items.length})`
    : undefined;

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
      onFooterClick={hasMore ? () => setExpanded((value) => !value) : undefined}
    >
      {visibleItems.map((item) => (
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
