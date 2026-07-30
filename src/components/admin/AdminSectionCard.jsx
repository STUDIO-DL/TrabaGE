export default function AdminSectionCard({ title, children, action }) {
  return (
    <section className="surface-card p-space-md sm:p-space-lg">
      {(title || action) && (
        <div className="mb-space-md flex items-center justify-between gap-space-sm">
          {title ? <h2 className="text-body font-semibold text-app-text">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
