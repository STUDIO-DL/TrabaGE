import PageContainer from '../layout/PageContainer';
import EmptyState from '../common/EmptyState';
import FetchErrorBanner from '../common/FetchErrorBanner';
import { DiscoverListSkeleton } from '../common/Skeleton';

export default function DiscoverSectionPage({
  title,
  loading,
  error,
  onRetry,
  isEmpty = false,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
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
        <EmptyState
          variant="soft"
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : (
        <div className="space-y-space-md p-space-base">{children}</div>
      )}
    </PageContainer>
  );
}
