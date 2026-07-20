import { useState } from 'react';
import ProfileSectionCard, { ProfileEntryRow } from './ProfileSectionCard';
import CertificateImageViewer from './CertificateImageViewer';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { Award } from '../../constants/icons';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';

const PREVIEW_COUNT = 1;

function formatMonthYear(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : '';
}

function formatIssuedMeta(issuedDate, expiresAt) {
  const parts = [];
  if (issuedDate) {
    parts.push(`Emitido: ${formatMonthYear(issuedDate)}`);
  }
  if (expiresAt) {
    parts.push(`Expira: ${formatMonthYear(expiresAt)}`);
  }
  return parts.length ? parts.join(' · ') : undefined;
}

export default function CertificationsSection({ items = [], isOwn, onAdd, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);

  const hasMore = items.length > PREVIEW_COUNT;
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const footerLabel = hasMore
    ? expanded
      ? 'Ver menos'
      : `Ver todas las licencias y certificados (${items.length})`
    : undefined;

  return (
    <>
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
            meta={formatIssuedMeta(item.issued_date, item.expires_at)}
            entryIcon={Award}
            entryIconTone="certification"
            isOwn={isOwn}
            onEdit={() => onEdit?.(item)}
            onDelete={() => onDelete?.(item.id)}
          >
            {item.image_path ? (
              <button
                type="button"
                onClick={() => setViewerItem(item)}
                className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Mostrar certificado
              </button>
            ) : null}
          </ProfileEntryRow>
        ))}
      </ProfileSectionCard>

      <CertificateImageViewer
        isOpen={Boolean(viewerItem)}
        onClose={() => setViewerItem(null)}
        imagePath={viewerItem?.image_path}
        title={viewerItem?.name}
      />
    </>
  );
}
