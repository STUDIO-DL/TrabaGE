import { useMemo, useState } from 'react';
import AppIcon from '../../common/AppIcon';
import AutocompleteInput from '../../ui/AutocompleteInput';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import { Sparkles, Trash2, ICON_SIZES } from '../../../constants/icons';
import {
  COMPANY_SERVICE_SUGGESTIONS,
  filterCompanyServiceSuggestions,
} from '../../../constants/companyServices';

const POPULAR_COUNT = 6;

function ServiceCard({ name, onDelete, readOnly }) {
  return (
    <Card padding="md" className="flex items-center justify-between gap-space-sm">
      <div className="flex min-w-0 items-center gap-space-sm">
        <AppIcon icon={Sparkles} size={ICON_SIZES.sm} className="shrink-0 text-primary-600" />
        <span className="truncate text-body-small font-medium text-app-text">{name}</span>
      </div>
      {!readOnly && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm text-app-subtle transition-colors duration-fast hover:bg-error-50 hover:text-error-600"
          aria-label="Eliminar servicio"
        >
          <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
        </button>
      )}
    </Card>
  );
}

export default function CompanyServicesSection({
  items = [],
  readOnly = false,
  onAdd,
  onDelete,
  variant: _variant = 'tab',
}) {
  const [serviceName, setServiceName] = useState('');
  const [adding, setAdding] = useState(false);
  const hasItems = items.length > 0;

  const existingNames = useMemo(() => items.map((item) => item.name), [items]);

  const suggestions = useMemo(
    () => filterCompanyServiceSuggestions(serviceName, existingNames),
    [serviceName, existingNames],
  );

  const popularSuggestions = useMemo(() => {
    const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));
    return COMPANY_SERVICE_SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase())).slice(
      0,
      POPULAR_COUNT,
    );
  }, [existingNames]);

  const addService = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) return;

    setAdding(true);
    await onAdd?.(trimmed);
    setServiceName('');
    setAdding(false);
  };

  if (readOnly && !hasItems) return null;

  return (
    <section className="px-space-base py-space-base">
      <div className="mb-space-base flex items-center justify-between gap-space-sm">
        <h3 className="text-body font-semibold text-app-text">Servicios</h3>
        {!readOnly && (
          <span className="text-caption text-app-muted">Opcional</span>
        )}
      </div>

      {!hasItems && !readOnly ? (
        <Card padding="lg" className="text-center">
          <p className="text-body-small text-app-muted">
            Añade los servicios que ofrece tu empresa para que los visitantes te conozcan mejor.
          </p>
        </Card>
      ) : hasItems ? (
        <div className="grid gap-space-sm sm:grid-cols-2">
          {items.map((item) => (
            <ServiceCard
              key={item.id}
              name={item.name}
              readOnly={readOnly}
              onDelete={onDelete ? () => onDelete(item.id) : undefined}
            />
          ))}
        </div>
      ) : null}

      {!readOnly && (
        <div className="mt-space-base space-y-space-sm border-t border-app-border pt-space-base">
          <div className="flex gap-space-sm">
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
              <p className="mb-space-xs text-caption text-app-muted">Sugerencias</p>
              <div className="flex flex-wrap gap-space-xs">
                {popularSuggestions.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => addService(service)}
                    className="rounded-radius-full border border-dashed border-app-border bg-app-card px-space-md py-space-xs text-caption text-app-muted transition-colors duration-fast hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
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
