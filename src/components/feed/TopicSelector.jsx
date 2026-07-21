import { useEffect, useMemo, useState } from 'react';
import Input from '../ui/Input';
import AppIcon from '../common/AppIcon';
import { Check, Search } from '../../constants/icons';
import { topicsService } from '../../services/topics.service';

const MAX_TOPICS = 3;

export default function TopicSelector({
  selected = [],
  onChange,
  disabled = false,
  max = MAX_TOPICS,
}) {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    topicsService.listActive().then(({ data, error }) => {
      if (cancelled) return;
      if (!error) setCatalog(data ?? []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedIds = useMemo(
    () => new Set((selected ?? []).map((topic) => topic.id)),
    [selected],
  );

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((topic) => topic.name.toLowerCase().includes(q));
  }, [catalog, query]);

  const handleToggle = (topic) => {
    if (disabled) return;

    if (selectedIds.has(topic.id)) {
      onChange?.((selected ?? []).filter((item) => item.id !== topic.id));
      return;
    }

    if (selected.length >= max) return;
    onChange?.([...selected, topic]);
  };

  const atLimit = selected.length >= max;
  const remaining = Math.max(0, max - selected.length);

  return (
    <section
      className="shrink-0 rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1"
      aria-labelledby="topic-selector-heading"
    >
      <div className="flex items-start justify-between gap-space-sm">
        <div className="min-w-0 flex-1">
          <h2
            id="topic-selector-heading"
            className="text-body-small font-semibold text-app-text"
          >
            Temas
          </h2>
          <p className="mt-space-xs text-caption text-app-muted">
            Elige entre 1 y {max} para clasificar tu publicación.
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center rounded-radius-md px-2.5 py-1 text-caption font-semibold tabular-nums',
            selected.length >= 1
              ? 'bg-primary-50 text-primary-700'
              : 'bg-app-surface text-app-muted',
          ].join(' ')}
          aria-live="polite"
        >
          {selected.length}/{max}
        </span>
      </div>

      <div className="mt-space-md">
        <Input
          icon={Search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? 'Cargando temas…' : 'Buscar tema…'}
          disabled={disabled || loading}
          aria-label="Buscar tema"
        />
      </div>

      <div
        className="mt-space-sm max-h-52 overflow-y-auto overscroll-contain rounded-radius-md border border-app-border bg-app-bg [-webkit-overflow-scrolling:touch] sm:max-h-64"
        role="listbox"
        aria-multiselectable="true"
        aria-label="Lista de temas"
      >
        {loading ? (
          <p className="px-space-base py-space-md text-caption text-app-muted">
            Cargando temas…
          </p>
        ) : filteredCatalog.length === 0 ? (
          <p className="px-space-base py-space-md text-caption text-app-muted">
            {query.trim()
              ? 'No hay temas que coincidan con tu búsqueda.'
              : 'No hay temas disponibles.'}
          </p>
        ) : (
          <ul className="divide-y divide-app-border">
            {filteredCatalog.map((topic) => {
              const isSelected = selectedIds.has(topic.id);
              const isDisabledOption = disabled || (!isSelected && atLimit);

              return (
                <li key={topic.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleToggle(topic)}
                    disabled={isDisabledOption}
                    className={[
                      'flex min-h-touch w-full items-center gap-space-md px-space-base py-space-sm text-left transition-colors duration-fast ease-out',
                      'focus:outline-none focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-100',
                      isSelected
                        ? 'bg-primary-50/70 text-primary-900'
                        : 'bg-transparent text-app-text hover:bg-app-surface active:bg-primary-50/40',
                      isDisabledOption && !isSelected ? 'cursor-not-allowed opacity-50' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                        isSelected
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-app-border bg-app-card text-transparent',
                      ].join(' ')}
                      aria-hidden
                    >
                      {isSelected ? (
                        <AppIcon icon={Check} size={12} className="text-white" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 text-body-small font-medium">
                      {topic.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected.length < 1 ? (
        <p className="mt-space-sm text-caption text-app-subtle">
          Elige al menos un tema para publicar.
        </p>
      ) : atLimit ? (
        <p className="mt-space-sm text-caption text-app-muted">
          Máximo de {max} temas alcanzado.
        </p>
      ) : (
        <p className="mt-space-sm text-caption text-app-subtle">
          Puedes añadir {remaining} más.
        </p>
      )}
    </section>
  );
}
