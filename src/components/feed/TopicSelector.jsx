import { useEffect, useMemo, useState } from 'react';
import AutocompleteInput from '../ui/AutocompleteInput';
import AppIcon from '../common/AppIcon';
import { X, ICON_SIZES } from '../../constants/icons';
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

  const suggestions = useMemo(() => {
    if (selected.length >= max) return [];

    const q = query.trim().toLowerCase();
    return catalog
      .filter((topic) => !selectedIds.has(topic.id))
      .filter((topic) => !q || topic.name.toLowerCase().includes(q))
      .slice(0, 12)
      .map((topic) => topic.name);
  }, [catalog, max, query, selected.length, selectedIds]);

  const handleSelectName = (name) => {
    if (selected.length >= max || disabled) return;
    const topic = catalog.find(
      (item) => item.name.toLowerCase() === String(name).toLowerCase(),
    );
    if (!topic || selectedIds.has(topic.id)) return;
    onChange?.([...selected, topic]);
    setQuery('');
  };

  const handleRemove = (topicId) => {
    if (disabled) return;
    onChange?.((selected ?? []).filter((topic) => topic.id !== topicId));
  };

  const atLimit = selected.length >= max;

  return (
    <section className="shrink-0 border-t border-app-border pt-space-md">
      <h2 className="text-body-small font-semibold text-app-text">Temas</h2>
      <p className="mt-space-xs text-caption text-app-muted">
        Selecciona hasta {max} temas para clasificar tu publicación.
      </p>

      {selected.length > 0 && (
        <div className="mt-space-sm flex flex-wrap gap-space-sm">
          {selected.map((topic) => (
            <span
              key={topic.id}
              className="inline-flex items-center gap-1 rounded-radius-md border border-app-border bg-app-surface px-2.5 py-1 text-caption text-app-text"
            >
              {topic.name}
              <button
                type="button"
                onClick={() => handleRemove(topic.id)}
                disabled={disabled}
                className="inline-flex rounded-radius-circular p-0.5 text-app-muted transition-colors hover:bg-app-card hover:text-app-text disabled:opacity-50"
                aria-label={`Quitar tema ${topic.name}`}
              >
                <AppIcon icon={X} size={ICON_SIZES.sm} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-space-sm">
        <AutocompleteInput
          value={query}
          onChange={setQuery}
          onSelect={handleSelectName}
          suggestions={suggestions}
          placeholder={
            atLimit
              ? `Máximo ${max} temas`
              : loading
                ? 'Cargando temas…'
                : 'Buscar tema…'
          }
          disabled={disabled || loading || atLimit}
          inputClassName="!rounded-xl !border-app-border !bg-app-card !text-app-text focus:!border-app-border focus:!ring-1 focus:!ring-app-border"
          listClassName="!border-app-border !bg-app-card !shadow-md"
        />
      </div>

      {selected.length < 1 && (
        <p className="mt-space-xs text-caption text-app-subtle">
          Elige al menos un tema para publicar.
        </p>
      )}
    </section>
  );
}
