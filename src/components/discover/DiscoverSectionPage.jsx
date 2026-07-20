import PageContainer from '../layout/PageContainer';
import FetchErrorBanner from '../common/FetchErrorBanner';
import { DiscoverListSkeleton } from '../common/Skeleton';
import EmptyPublicationsState from './EmptyPublicationsState';

export default function DiscoverSectionPage({
  title,
  loading,
  error,
  onRetry,
  isEmpty = false,
  emptyIcon,
  children,
}) {
  return (
    <PageContainer title={title} backButton>
      {loading ? (
        <DiscoverListSkeleton count={4} />
      ) : error ? (
        <div className="p-space-base">
          <FetchErrorBanner message={error} onRetry={onRetry} />
        </div>
      ) : isEmpty ? (
        <EmptyPublicationsState icon={emptyIcon} />
      ) : (
        <div className="space-y-space-md p-space-base">{children}</div>
      )}
    </PageContainer>
  );
}
