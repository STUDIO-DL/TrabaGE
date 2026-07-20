import Skeleton from '../common/Skeleton';

function ConversationItemSkeleton() {
  return (
    <div className="flex items-center gap-space-md border-b border-app-border px-space-base py-space-md" aria-hidden="true">
      <Skeleton className="h-12 w-12 shrink-0 rounded-radius-circular" />
      <div className="min-w-0 flex-1 space-y-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export default function ConversationListSkeleton({ count = 6 }) {
  return (
    <div aria-busy="true" aria-label="Cargando conversaciones">
      {Array.from({ length: count }, (_, index) => (
        <ConversationItemSkeleton key={index} />
      ))}
    </div>
  );
}
