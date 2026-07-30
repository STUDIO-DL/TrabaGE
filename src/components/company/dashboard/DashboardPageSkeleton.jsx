export default function DashboardPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando panel">
      <div className="surface-card h-40 animate-pulse bg-app-border/30" />
      <div className="h-16 animate-pulse rounded-2xl bg-app-border/25" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card h-32 animate-pulse bg-app-border/30" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="surface-card h-80 animate-pulse bg-app-border/30 xl:col-span-3" />
        <div className="surface-card h-80 animate-pulse bg-app-border/30 xl:col-span-2" />
      </div>
      <div className="surface-card h-72 animate-pulse bg-app-border/30" />
    </div>
  );
}
