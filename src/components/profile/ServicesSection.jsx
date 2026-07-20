import { useMemo, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import AutocompleteInput from '../ui/AutocompleteInput';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Trash2, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { SERVICE_SUGGESTIONS, filterServiceSuggestions } from '../../constants/services';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';

const PREVIEW_COUNT = 8;
const POPULAR_COUNT = 6;

export default function ServicesSection({ items = [], isOwn, onAdd, onDelete }) {
  const [serviceName, setServiceName] = useState('');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > PREVIEW_COUNT;
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const footerLabel = hasMore
    ? expanded
      ? 'Ver menos'
      : `Ver todos los servicios (${items.length})`
    : undefined;

  const existingNames = useMemo(() => items.map((item) => item.name), [items]);

  const suggestions = useMemo(
    () => filterServiceSuggestions(serviceName, existingNames),
    [serviceName, existingNames],
  );

  const popularSuggestions = useMemo(() => {
    const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
    return SERVICE_SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase())).slice(0, POPULAR_COUNT);
  }, [existingNames]);

  const addService = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return;

    setAdding(true);
    await onAdd?.(trimmed);
    setServiceName('');
    setAdding(false);
  };

  const handleAdd = () => addService(serviceName);

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.service}
      iconTone="service"
      title="Servicios que ofrezco"
      isOwn={isOwn}
      isEmpty={!items.length && !isOwn}
      emptyText={getProfileSectionEmptyCopy('services', isOwn)}
      footerLabel={footerLabel}
      onFooterClick={hasMore ? () => setExpanded((value) => !value) : undefined}
    >
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-surface px-3.5 py-1.5 text-sm text-app-text"
          >
            {item.name}
            {isOwn && (
              <button
                type="button"
                onClick={() => onDelete?.(item.id)}
                className="ml-0.5 rounded p-0.5 text-app-subtle hover:bg-app-surface hover:text-error-600"
                aria-label="Eliminar"
              >
                <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
              </button>
            )}
          </span>
        ))}
      </div>

      {isOwn && (
        <div className="mt-4 space-y-3 border-t border-app-divider pt-4">
          <div className="flex gap-2">
            <AutocompleteInput
              value={serviceName}
              onChange={setServiceName}
              onSelect={addService}
              suggestions={suggestions}
              placeholder="Escribe un servicio"
              disabled={adding}
            />
            <Button type="button" size="sm" loading={adding} onClick={handleAdd}>
              Añadir
            </Button>
          </div>

          {!serviceName.trim() && popularSuggestions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-app-muted">Sugerencias</p>
              <div className="flex flex-wrap gap-2">
                {popularSuggestions.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => addService(service)}
                    className="rounded-full border border-dashed border-app-border bg-app-card px-3 py-1 text-xs text-app-muted hover:border-app-muted hover:bg-app-surface hover:text-app-text"
                  >
                    + {service}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ProfileSectionCard>
  );
}
