import PageContainer from '../layout/PageContainer';
import FetchErrorBanner from '../common/FetchErrorBanner';
import { DiscoverListSkeleton } from '../common/Skeleton';
import EmptyPublicationsState from './EmptyPublicationsState';
import { FETCH_ERROR_DESCRIPTION, FETCH_ERROR_TITLE } from '../../constants/emptyContent';

export default function DiscoverSectionPage({
  title,
  loading,
  error,
  onRetry,
  isEmpty = false,
  emptyIcon,
  sectionKey = 'default',
  children,
}) {
  return (
    <PageContainer title={title} backButton>
      {loading ? (
        <DiscoverListSkeleton count={4} />
      ) : error ? (
        <div className="p-space-base">
          <FetchErrorBanner
            message={`${FETCH_ERROR_TITLE} ${FETCH_ERROR_DESCRIPTION}`}
            onRetry={onRetry}
          />
        </div>
      ) : isEmpty ? (
        <EmptyPublicationsState icon={emptyIcon} sectionKey={sectionKey} />
      ) : (
        <div className="space-y-space-md p-space-base">{children}</div>
      )}
    </PageContainer>
  );
}
