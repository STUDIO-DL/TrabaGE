import Card from '../ui/Card';
import { formatDate, formatRelativeTime } from '../../utils/formatDate';
import { EVENT_TYPES } from '../../constants/feedContentTypes';

const EVENT_LABELS = Object.fromEntries(EVENT_TYPES.map((item) => [item.value, item.label]));

export default function FeedEventCard({ event }) {
  if (!event) return null;

  const typeLabel = EVENT_LABELS[event.event_type] ?? 'Evento';

  return (
    <Card className="mb-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">{typeLabel}</p>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{event.title}</h3>
        </div>
        <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(event.starts_at)}</span>
      </div>
      {event.description && <p className="text-sm text-gray-700">{event.description}</p>}
      <div className="mt-3 space-y-1 text-sm text-gray-600">
        {event.starts_at && (
          <p>
            <span className="font-medium text-gray-800">Fecha:</span> {formatDate(event.starts_at)}
          </p>
        )}
        {event.location && (
          <p>
            <span className="font-medium text-gray-800">Lugar:</span> {event.location}
          </p>
        )}
      </div>
    </Card>
  );
}
