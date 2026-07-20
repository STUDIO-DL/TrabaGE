import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import FeedCourseCard from '../../components/feed/FeedCourseCard';
import { GraduationCap } from '../../constants/icons';
import { discoverService } from '../../services/discover.service';

export default function Scholarships() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await discoverService.getScholarships();
    if (fetchError) setError('No se pudieron cargar las becas.');
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiscoverSectionPage
      title="Becas"
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={!loading && !error && items.length === 0}
      emptyIcon={GraduationCap}
      emptyTitle="No hay becas disponibles"
      emptyDescription="Pronto publicaremos becas y ayudas de formación relevantes para ti."
    >
      {items.map((course) => (
        <FeedCourseCard key={course.id} course={course} />
      ))}
    </DiscoverSectionPage>
  );
}
