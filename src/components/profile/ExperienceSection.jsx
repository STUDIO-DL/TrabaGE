import { useState } from 'react';
import ProfileSectionCard, { ProfileEntryRow } from './ProfileSectionCard';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { Briefcase } from '../../constants/icons';
import { formatDateRange } from '../../utils/formatDate';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';

const PREVIEW_COUNT = 1;

export default function ExperienceSection({ items = [], isOwn, onAdd, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > PREVIEW_COUNT;
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const footerLabel = hasMore
    ? expanded
      ? 'Ver menos'
      : `Ver toda la experiencia (${items.length})`
    : undefined;

  return (
    <ProfileSectionCard
      id="experience"
      icon={PROFILE_SECTION_ICONS.experience}
      iconTone="experience"
      title="Experiencia laboral"
      isOwn={isOwn}
      onAdd={onAdd}
      isEmpty={!items.length}
      emptyText={getProfileSectionEmptyCopy('experience', isOwn)}
      footerLabel={footerLabel}
      onFooterClick={hasMore ? () => setExpanded((value) => !value) : undefined}
    >
      {visibleItems.map((item) => (
        <ProfileEntryRow
          key={item.id}
          title={item.position}
          subtitle={item.company}
          meta={[formatDateRange(item.start_date, item.end_date), item.location].filter(Boolean).join(' · ') || undefined}
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
