import FetchErrorBanner from '../common/FetchErrorBanner';
import { DiscoverHubSkeleton } from '../common/Skeleton';
import DiscoverCard from './DiscoverCard';
import HiringCompaniesCard from './HiringCompaniesCard';
import { getDiscoverFeaturedSection, getDiscoverGridSections } from '../../constants/discoverSections';
import { useDiscoverHub } from '../../hooks/useDiscoverHub';
import { useAuth } from '../../hooks/useAuth';

export default function DiscoverHub() {
  const { role } = useAuth();
  const { counts, hiringPreview, loading, error, refetch } = useDiscoverHub();
  const featured = getDiscoverFeaturedSection(role);
  const gridSections = getDiscoverGridSections(role);

  if (loading) {
    return <DiscoverHubSkeleton showFeatured={Boolean(featured)} cardCount={gridSections.length || 6} />;
  }

  return (
    <div className="space-y-space-md p-space-base">
      {error ? (
        <FetchErrorBanner message="No se pudieron cargar las oportunidades." onRetry={refetch} />
      ) : null}

      {featured ? (
        <HiringCompaniesCard companies={hiringPreview} loading={false} />
      ) : null}

      <div className="grid grid-cols-2 gap-space-sm">
        {gridSections.map((section) => (
          <DiscoverCard key={section.id} section={section} count={counts[section.id]} />
        ))}
      </div>
    </div>
  );
}
