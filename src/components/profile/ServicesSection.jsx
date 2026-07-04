import { useMemo, useState } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import AutocompleteInput from '../ui/AutocompleteInput';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { Trash2, ICON_SIZES } from '../../constants/icons';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { SERVICE_SUGGESTIONS, filterServiceSuggestions } from '../../constants/services';

const PREVIEW_COUNT = 8;
const POPULAR_COUNT = 6;

export default function ServicesSection({ items = [], isOwn, onAdd, onDelete }) {
  const [serviceName, setServiceName] = useState('');
  const [adding, setAdding] = useState(false);
  const preview = items.slice(0, PREVIEW_COUNT);
  const footerLabel =
    items.length > 0 ? `Ver todos los servicios (${items.length})` : undefined;

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
      emptyText="Sin servicios registrados."
      footerLabel={footerLabel}
    >
      <div className="flex flex-wrap gap-2">
        {preview.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-sm text-orange-900"
          >
            {item.name}
            {isOwn && (
              <button
                type="button"
                onClick={() => onDelete?.(item.id)}
                className="ml-0.5 rounded p-0.5 text-orange-400 hover:bg-red-50 hover:text-red-500"
                aria-label="Eliminar"
              >
                <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
              </button>
            )}
          </span>
        ))}
      </div>

      {isOwn && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
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
              <p className="mb-2 text-xs font-medium text-gray-500">Sugerencias</p>
              <div className="flex flex-wrap gap-2">
                {popularSuggestions.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => addService(service)}
                    className="rounded-full border border-dashed border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800"
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
