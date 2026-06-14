export default function Skeleton({ className = '', ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-gray-200/80 ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-4/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" aria-hidden="true">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-4 h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3.5 w-2/5" />
      </div>
      <div className="mt-4 flex justify-end">
        <Skeleton className="h-4 w-24" />
      </div>
    </article>
  );
}

export function JobListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando empleos">
      {Array.from({ length: count }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <article className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" aria-hidden="true">
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </article>
  );
}

export function PostListSkeleton({ count = 3 }) {
  return (
    <div aria-busy="true" aria-label="Cargando publicaciones">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function NotificationItemSkeleton() {
  return (
    <div className="flex gap-3 border-b border-gray-100 py-4" aria-hidden="true">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function NotificationListSkeleton({ count = 5 }) {
  return (
    <div aria-busy="true" aria-label="Cargando notificaciones">
      {Array.from({ length: count }, (_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function ApplicationCardSkeleton() {
  return (
    <article className="mb-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" aria-hidden="true">
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-3 h-4 w-1/2" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </article>
  );
}

export function ApplicationListSkeleton({ count = 3 }) {
  return (
    <div aria-busy="true" aria-label="Cargando aplicaciones">
      {Array.from({ length: count }, (_, i) => (
        <ApplicationCardSkeleton key={i} />
      ))}
    </div>
  );
}
