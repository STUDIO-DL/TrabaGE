import { useCallback, useEffect, useState } from 'react';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import FeedEventCard from '../../components/feed/FeedEventCard';
import { Calendar } from '../../constants/icons';
import { discoverService } from '../../services/discover.service';

export default function Events() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await discoverService.getEvents();
    if (fetchError) setError('No se pudieron cargar los eventos.');
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiscoverSectionPage
      title="Eventos"
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={!loading && !error && items.length === 0}
      emptyIcon={Calendar}
      emptyTitle="No hay eventos próximos"
      emptyDescription="Ferias de empleo, congresos y jornadas aparecerán aquí cuando estén disponibles."
    >
      {items.map((event) => (
        <FeedEventCard key={event.id} event={event} />
      ))}
    </DiscoverSectionPage>
  );
}
