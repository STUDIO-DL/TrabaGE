import { hasCompanyDescription } from '../../../utils/companyProfile';

export default function CompanyAboutSection({
  profile,
  readOnly = false,
  onEditAbout,
  expanded = false,
  onToggleExpand,
  onViewMore,
  compact = false,
  embedded = false,
}) {
  const description = profile?.description?.trim();
  const hasDescription = hasCompanyDescription(profile);
  const emptyText = 'No hay información disponible sobre esta empresa.';
  const previewLimit = compact ? 120 : 280;
  const showPreview = hasDescription && !expanded && description.length > previewLimit;
  const previewText = showPreview ? `${description.slice(0, previewLimit).trim()}…` : description;

  return (
    <section className={embedded ? '' : 'px-space-base py-space-base'}>
      <div className="flex items-center justify-between gap-space-sm">
        <h3 className="text-body font-semibold text-app-text">Acerca de</h3>
        {!readOnly && onEditAbout && (
          <button
            type="button"
            onClick={onEditAbout}
            className="shrink-0 rounded-radius-sm px-space-sm py-space-xs text-body-small font-medium text-primary-600 transition-colors duration-fast hover:bg-primary-50"
          >
            Editar
          </button>
        )}
      </div>
      <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">
        {hasDescription ? previewText : emptyText}
      </p>
      {hasDescription && description.length > previewLimit && (!expanded || onToggleExpand) && (
        <button
          type="button"
          onClick={onToggleExpand || onViewMore}
          className="mt-space-sm text-body-small font-medium text-primary-600 transition-colors duration-fast hover:text-primary-700"
        >
          {expanded ? 'Mostrar menos' : 'Ver más'}
        </button>
      )}
    </section>
  );
}
