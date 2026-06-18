import { useMemo, useState } from 'react';
import AppIcon from '../../common/AppIcon';
import AutocompleteInput from '../../ui/AutocompleteInput';
import Button from '../../ui/Button';
import { Sparkles, Trash2, ICON_SIZES } from '../../../constants/icons';
import {
  COMPANY_SERVICE_SUGGESTIONS,
  filterCompanyServiceSuggestions,
} from '../../../constants/companyServices';

const PREVIEW_COUNT = 10;
const POPULAR_COUNT = 6;

export default function CompanyServicesSection({
  items = [],
  readOnly = false,
  onAdd,
  onDelete,
}) {
  const [serviceName, setServiceName] = useState('');
  const [adding, setAdding] = useState(false);
  const preview = items.slice(0, PREVIEW_COUNT);
  const hasItems = items.length > 0;

  const existingNames = useMemo(() => items.map((item) => item.name), [items]);

  const suggestions = useMemo(
    () => filterCompanyServiceSuggestions(serviceName, existingNames),
    [serviceName, existingNames],
  );

  const popularSuggestions = useMemo(() => {
    const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
    return COMPANY_SERVICE_SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase())).slice(
      0,
      POPULAR_COUNT,
    );
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

  if (readOnly && !hasItems) return null;

  return (
    <section className="border-b border-gray-200 bg-white px-4 py-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
          <AppIcon icon={Sparkles} size={ICON_SIZES.default} className="text-primary-600" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Servicios que ofrecemos</h3>
          <p className="text-xs text-gray-500">Opcional · visible para quienes visiten tu perfil</p>
        </div>
      </div>

      {!hasItems && !readOnly ? (
        <div className="rounded-xl border border-dashed border-primary-200 bg-gradient-to-b from-primary-50/50 to-white px-4 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-primary-100 bg-white">
            <AppIcon icon={Sparkles} size={ICON_SIZES.lg} className="text-primary-300" />
          </div>
          <p className="mt-4 text-sm text-gray-600">
            ¿Tu empresa ofrece servicios además de empleo? Añádelos aquí para que los candidatos te
            conozcan mejor.
          </p>
        </div>
      ) : hasItems ? (
        <div className="flex flex-wrap gap-2">
          {preview.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1.5 text-sm font-medium text-primary-900"
            >
              {item.name}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onDelete?.(item.id)}
                  className="ml-0.5 rounded p-0.5 text-primary-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="Eliminar"
                >
                  <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
                </button>
              )}
            </span>
          ))}
          {items.length > PREVIEW_COUNT && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
              +{items.length - PREVIEW_COUNT} más
            </span>
          )}
        </div>
      ) : null}

      {!readOnly && (
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
            <Button type="button" size="sm" loading={adding} onClick={() => addService(serviceName)}>
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
                    className="rounded-full border border-dashed border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
                  >
                    + {service}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
