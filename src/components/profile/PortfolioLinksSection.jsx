import { useMemo, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Trash2, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';
import { normalizeHttpsUrl, safeExternalUrl } from '../../utils/safeUrl';

const LINK_TYPE_OPTIONS = [
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Sitio web' },
  { value: 'behance', label: 'Behance' },
  { value: 'dribbble', label: 'Dribbble' },
  { value: 'portfolio', label: 'Portafolio' },
  { value: 'other', label: 'Otro' },
];

export default function PortfolioLinksSection({ items = [], isOwn, onAdd, onDelete }) {
  const [draft, setDraft] = useState({ type: 'portfolio', label: '', url: '' });
  const [saving, setSaving] = useState(false);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [items],
  );

  const handleAdd = async () => {
    const url = normalizeHttpsUrl(draft.url);
    if (!url) return;
    setSaving(true);
    await onAdd?.({
      type: draft.type || 'portfolio',
      label: draft.label?.trim() || null,
      url,
      sort_order: sortedItems.length,
    });
    setDraft({ type: draft.type || 'portfolio', label: '', url: '' });
    setSaving(false);
  };

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.contact}
      iconTone="contact"
      title="Portafolio y enlaces"
      isOwn={isOwn}
      isEmpty={!sortedItems.length && !isOwn}
      emptyText={getProfileSectionEmptyCopy('portfolio', isOwn)}
    >
      <div className="space-y-2">
        {sortedItems.map((item) => {
          const safeHref = safeExternalUrl(item.url);
          return (
          <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
            {safeHref ? (
            <a
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-primary-700 hover:underline"
            >
              {(item.label || item.type || 'Enlace').toString()}
              {' · '}
              {safeHref}
            </a>
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm text-gray-500">
                {(item.label || item.type || 'Enlace').toString()}
              </span>
            )}
            {isOwn && (
              <button
                type="button"
                onClick={() => onDelete?.(item.id)}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Eliminar enlace"
              >
                <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
              </button>
            )}
          </div>
        );
        })}
      </div>

      {isOwn && (
        <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <Select
            label="Tipo"
            value={draft.type}
            onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
            options={LINK_TYPE_OPTIONS}
          />
          <Input
            label="Etiqueta (opcional)"
            placeholder="Mi portfolio UX"
            value={draft.label}
            onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
          />
          <Input
            label="URL"
            placeholder="https://..."
            value={draft.url}
            onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))}
            className="sm:col-span-2"
          />
          <Button type="button" onClick={handleAdd} loading={saving} className="sm:col-span-2">
            Añadir enlace
          </Button>
        </div>
      )}
    </ProfileSectionCard>
  );
}
