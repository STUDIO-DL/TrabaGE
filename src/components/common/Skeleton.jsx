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
      className="rounded-radius-md border border-app-border bg-app-surface p-3 shadow-elevation-1"
      aria-hidden="true"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-radius-sm" />
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-8 w-8 shrink-0 rounded-radius-sm" />
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

export function AppShellSkeleton({ showBottomNav = true }) {
  return (
    <div className="min-h-dvh bg-app-bg" aria-busy="true" aria-label="Cargando">
      <div className="border-b border-app-border bg-app-card px-space-base py-space-md">
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="p-space-base">
        <PostListSkeleton count={3} />
      </div>
      {showBottomNav ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-app-border bg-app-card/95 px-space-base py-space-sm pb-safe">
          <div className="mx-auto flex max-w-lg justify-around">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-radius-md" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FollowersListSkeleton({ count = 4 }) {
  return (
    <ul className="mt-4 divide-y divide-gray-100" aria-busy="true" aria-label="Cargando seguidores">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-radius-circular" />
          <div className="min-w-0 flex-1 space-y-space-sm">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminStatGridSkeleton({ count = 7 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface-card p-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-space-base h-8 w-16" />
          <Skeleton className="mt-1 h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando panel de administración">
      <AdminStatGridSkeleton count={7} />
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminTableSkeleton({ rows = 8, columns = 5 }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
      aria-busy="true"
      aria-label="Cargando tabla"
    >
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="flex gap-4 bg-gray-50 px-4 py-3">
            {Array.from({ length: columns }, (_, i) => (
              <Skeleton key={i} className="h-3 w-20 shrink-0" />
            ))}
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3">
                {Array.from({ length: columns }, (_, j) => (
                  <Skeleton key={j} className="h-4 w-24 shrink-0" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-busy="true" aria-label="Cargando perfil admin">
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Skeleton className="mb-4 h-5 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminSettingsSkeleton() {
  return (
    <div
      className="max-w-xl space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      aria-busy="true"
      aria-label="Cargando configuración"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-10 w-36 rounded-xl" />
    </div>
  );
}

export function AdminNotificationsSkeleton() {
  return (
    <div
      className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      aria-busy="true"
      aria-label="Cargando notificaciones"
    >
      <Skeleton className="mb-4 h-5 w-48" />
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminUserDetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando detalle">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-radius-circular" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex justify-between py-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <FormPageSkeleton fields={3} />
    </div>
  );
}

export function AuthConfirmSkeleton() {
  return (
    <div className="w-full space-y-5" aria-busy="true" aria-label="Verificando correo">
      <Skeleton className="mx-auto h-14 w-14 rounded-radius-circular" />
      <Skeleton className="mx-auto h-6 w-48" />
      <SkeletonText lines={2} className="mx-auto max-w-xs" />
    </div>
  );
}

export function DiscoverCardSkeleton() {
  return (
    <article
      className="rounded-radius-lg border border-app-border bg-app-card p-space-md shadow-elevation-1"
      aria-hidden="true"
    >
      <Skeleton className="mb-space-sm h-10 w-10 rounded-radius-md" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-space-sm h-3 w-full" />
    </article>
  );
}

export function HiringCompaniesSkeleton() {
  return (
    <article
      className="rounded-radius-lg border border-app-border bg-app-card p-space-md shadow-elevation-1"
      aria-hidden="true"
    >
      <div className="mb-space-md flex items-center gap-space-sm">
        <Skeleton className="h-9 w-9 rounded-radius-md" />
        <div className="flex-1 space-y-space-sm">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-space-md py-space-sm">
          <Skeleton className="h-10 w-10 shrink-0 rounded-radius-sm" />
          <div className="flex-1 space-y-space-sm">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </article>
  );
}

export function DiscoverHubSkeleton({ showFeatured = true, cardCount = 6 }) {
  return (
    <div className="space-y-space-md p-space-base" aria-busy="true" aria-label="Cargando oportunidades">
      {showFeatured ? <HiringCompaniesSkeleton /> : null}
      <div className="grid grid-cols-2 gap-space-sm">
        {Array.from({ length: cardCount }, (_, i) => (
          <DiscoverCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DiscoverListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-space-md p-space-base" aria-busy="true" aria-label="Cargando listado">
      {Array.from({ length: count }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

