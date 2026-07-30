import { formatDate, formatRelativeTime } from '../../utils/formatDate';
import { EVENT_TYPES } from '../../constants/feedContentTypes';

const EVENT_LABELS = Object.fromEntries(EVENT_TYPES.map((item) => [item.value, item.label]));

export default function FeedEventCard({ event }) {
  if (!event) return null;

  const typeLabel = EVENT_LABELS[event.event_type] ?? 'Evento';

  return (
    <article className="surface-flat border-b border-app-divider py-space-base last:border-b-0 sm:py-space-lg">
      <div className="mb-space-sm flex items-start justify-between gap-space-sm">
        <div className="min-w-0">
          <p className="text-caption font-medium text-app-subtle">{typeLabel}</p>
          <h3 className="mt-space-xs text-user-content text-body font-semibold text-app-text">
            {event.title}
          </h3>
        </div>
        <span className="shrink-0 text-caption text-app-subtle">
          {formatRelativeTime(event.starts_at)}
        </span>
      </div>
      {event.description ? (
        <p className="text-body-small text-app-muted">{event.description}</p>
      ) : null}
      <div className="mt-space-sm space-y-space-xs text-body-small text-app-muted">
        {event.starts_at ? (
          <p>
            <span className="font-medium text-app-text">Fecha:</span> {formatDate(event.starts_at)}
          </p>
        ) : null}
        {event.location ? (
          <p>
            <span className="font-medium text-app-text">Lugar:</span> {event.location}
          </p>
        ) : null}
      </div>
    </article>
  );
}
