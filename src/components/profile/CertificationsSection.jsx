import { useState } from 'react';
import ProfileSectionCard, { ProfileEntryRow } from './ProfileSectionCard';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { Award } from '../../constants/icons';
import { formatDate } from '../../utils/formatDate';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';

const PREVIEW_COUNT = 2;

export default function CertificationsSection({ items = [], isOwn, onAdd, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > PREVIEW_COUNT;
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const footerLabel = hasMore
    ? expanded
      ? 'Ver menos'
      : `Ver todas las licencias y certificados (${items.length})`
    : undefined;

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.certification}
      iconTone="certification"
      title="Licencias y certificados"
      isOwn={isOwn}
      onAdd={onAdd}
      isEmpty={!items.length}
      emptyText={getProfileSectionEmptyCopy('certifications', isOwn)}
      footerLabel={footerLabel}
      onFooterClick={hasMore ? () => setExpanded((value) => !value) : undefined}
    >
      {visibleItems.map((item) => (
        <ProfileEntryRow
          key={item.id}
          title={item.name}
          subtitle={item.issuer}
          meta={item.issued_date ? formatDate(item.issued_date) : undefined}
          entryIcon={Award}
          entryIconTone="certification"
          isOwn={isOwn}
          onEdit={() => onEdit?.(item)}
          onDelete={() => onDelete?.(item.id)}
        />
      ))}
    </ProfileSectionCard>
  );
}
