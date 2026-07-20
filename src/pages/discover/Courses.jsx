import { useCallback, useEffect, useState } from 'react';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import FeedCourseCard from '../../components/feed/FeedCourseCard';
import { Sparkles } from '../../constants/icons';
import { discoverService } from '../../services/discover.service';

export default function Courses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await discoverService.getCourses();
    if (fetchError) setError('No se pudieron cargar los cursos.');
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiscoverSectionPage
      title="Cursos y certificaciones"
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={!loading && !error && items.length === 0}
      emptyIcon={Sparkles}
      emptyTitle="No hay cursos disponibles"
      emptyDescription="Formación y certificaciones relevantes para tu desarrollo profesional aparecerán aquí."
    >
      {items.map((course) => (
        <FeedCourseCard key={course.id} course={course} />
      ))}
    </DiscoverSectionPage>
  );
}
