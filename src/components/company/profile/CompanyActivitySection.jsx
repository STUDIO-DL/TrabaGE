export default function CompanyActivitySection({ items = null }) {
  const hasItems = Array.isArray(items) && items.length > 0;
  if (!hasItems) return null;

  return (
    <section className="bg-app-card px-4 py-5 pb-8">
      <h3 className="flex items-center gap-2 text-base font-semibold text-app-text">
        <span className="h-5 w-1 rounded-full bg-primary-600" aria-hidden />
        Actividad reciente
      </h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
            <p className="text-sm text-app-text">{item.summary || item.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
