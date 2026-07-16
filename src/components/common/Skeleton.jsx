export default function Skeleton({ className = '', ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-radius-md bg-app-disabled ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-space-sm ${className}`} aria-hidden="true">
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
    <article
      className="rounded-radius-md border border-app-border bg-app-card p-space-md shadow-elevation-1"
      aria-hidden="true"
    >
      <div className="flex gap-space-md">
        <Skeleton className="h-10 w-10 shrink-0 rounded-radius-md" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-space-sm h-3.5 w-1/2" />
          <Skeleton className="mt-space-sm h-3 w-1/3" />
          <div className="mt-space-sm flex gap-space-sm">
            <Skeleton className="h-5 w-16 rounded-radius-sm" />
            <Skeleton className="h-5 w-20 rounded-radius-sm" />
          </div>
          <div className="mt-space-md flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24 rounded-radius-md" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function JobListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-space-md" aria-busy="true" aria-label="Cargando empleos">
      {Array.from({ length: count }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <article
      className="mb-space-base rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1"
      aria-hidden="true"
    >
      <div className="mb-space-md flex items-center gap-space-md">
        <Skeleton className="h-10 w-10 shrink-0 rounded-radius-circular" />
        <div className="min-w-0 flex-1 space-y-space-sm">
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
    <div className="flex gap-space-md border-b border-app-divider py-space-base" aria-hidden="true">
      <Skeleton className="h-10 w-10 shrink-0 rounded-radius-circular" />
      <div className="min-w-0 flex-1 space-y-space-sm">
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
    <article
      className="mb-space-md rounded-radius-md border border-app-border bg-app-card p-space-base shadow-elevation-1"
      aria-hidden="true"
    >
      <Skeleton className="mb-space-sm h-5 w-3/4" />
      <Skeleton className="mb-space-md h-4 w-1/2" />
      <Skeleton className="h-6 w-20 rounded-radius-circular" />
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

export function ProfileCardSkeleton() {
  return (
    <article
      className="rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1"
      aria-hidden="true"
    >
      <div className="flex items-center gap-space-base">
        <Skeleton className="h-14 w-14 shrink-0 rounded-radius-circular" />
        <div className="min-w-0 flex-1 space-y-space-sm">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </article>
  );
}

export function CompanyCardSkeleton() {
  return (
    <article
      className="rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1"
      aria-hidden="true"
    >
      <div className="flex items-center gap-space-base">
        <Skeleton className="h-12 w-12 shrink-0 rounded-radius-md" />
        <div className="min-w-0 flex-1 space-y-space-sm">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    </article>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="space-y-space-base p-space-base" aria-busy="true" aria-label="Cargando perfil">
      <div className="overflow-hidden rounded-radius-lg border border-app-border bg-app-card shadow-elevation-1">
        <Skeleton className="h-28 w-full rounded-none" />
        <div className="-mt-10 px-space-base pb-space-base">
          <Skeleton className="h-20 w-20 rounded-radius-circular ring-4 ring-app-card" />
          <Skeleton className="mt-space-md h-5 w-1/2" />
          <Skeleton className="mt-space-sm h-3.5 w-2/3" />
          <div className="mt-space-base flex gap-space-sm">
            <Skeleton className="h-9 w-24 rounded-radius-md" />
            <Skeleton className="h-9 w-24 rounded-radius-md" />
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1"
        >
          <Skeleton className="mb-space-md h-4 w-1/3" />
          <SkeletonText lines={3} />
        </div>
      ))}
    </div>
  );
}

export function JobDetailSkeleton() {
  return (
    <div className="space-y-space-base p-space-base" aria-busy="true" aria-label="Cargando empleo">
      <div className="rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="mt-space-sm h-4 w-1/2" />
        <Skeleton className="mt-space-sm h-3.5 w-2/3" />
        <div className="mt-space-md flex gap-space-sm">
          <Skeleton className="h-6 w-16 rounded-radius-circular" />
          <Skeleton className="h-6 w-20 rounded-radius-circular" />
          <Skeleton className="h-6 w-14 rounded-radius-circular" />
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1"
        >
          <Skeleton className="mb-space-md h-4 w-1/4" />
          <SkeletonText lines={4} />
        </div>
      ))}
    </div>
  );
}

export function SearchResultItemSkeleton() {
  return (
    <div className="flex gap-space-md border-b border-app-border p-space-base" aria-hidden="true">
      <Skeleton className="h-10 w-10 shrink-0 rounded-radius-circular" />
      <div className="min-w-0 flex-1 space-y-space-sm">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SearchResultsSkeleton({ count = 6 }) {
  return (
    <div aria-busy="true" aria-label="Cargando resultados">
      {Array.from({ length: count }, (_, i) => (
        <SearchResultItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function FormPageSkeleton({ fields = 5 }) {
  return (
    <div className="space-y-space-base p-space-base" aria-busy="true" aria-label="Cargando formulario">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-space-sm">
          <Skeleton className="h-3.5 w-1/4" />
          <Skeleton className="h-11 w-full rounded-radius-md" />
        </div>
      ))}
      <Skeleton className="mt-space-md h-11 w-full rounded-radius-md" />
    </div>
  );
}

