import { hasCompanyDescription } from '../../../utils/companyProfile';
import { sectionLinkClass } from './companyProfileStyles';

export default function CompanyAboutSection({
  profile,
  readOnly = false,
  onEditAbout,
  expanded = false,
  onToggleExpand,
  onViewMore,
  compact = false,
  embedded = false,
  hideWhenEmpty = false,
}) {
  const description = profile?.description?.trim();
  const hasDescription = hasCompanyDescription(profile);
  const emptyText = 'No hay información disponible sobre esta empresa.';
  const previewLimit = compact ? 160 : 320;
  const showPreview = hasDescription && !expanded && description.length > previewLimit;
  const previewText = showPreview ? `${description.slice(0, previewLimit).trim()}…` : description;
  const mission = profile?.mission?.trim();
  const vision = profile?.vision?.trim();

  if (hideWhenEmpty && !hasDescription && !mission && !vision) return null;

  const content = (
    <>
      <p className="text-body-small leading-relaxed text-app-muted">
        {hasDescription ? previewText : emptyText}
      </p>
      {hasDescription && description.length > previewLimit && (!expanded || onToggleExpand) && (
        <button
          type="button"
          onClick={onToggleExpand || onViewMore}
          className={`mt-space-sm ${sectionLinkClass}`}
        >
          {expanded ? 'Mostrar menos' : 'Ver más'}
        </button>
      )}
      {!compact && mission && (
        <div className="mt-space-md">
          <p className="text-caption font-semibold uppercase tracking-wide text-app-subtle">Misión</p>
          <p className="mt-space-xs text-body-small leading-relaxed text-app-muted">{mission}</p>
        </div>
      )}
      {!compact && vision && (
        <div className="mt-space-md">
          <p className="text-caption font-semibold uppercase tracking-wide text-app-subtle">Visión</p>
          <p className="mt-space-xs text-body-small leading-relaxed text-app-muted">{vision}</p>
        </div>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="px-space-base py-space-base">
      <div className="flex items-center justify-between gap-space-sm">
        <h3 className="text-body font-semibold text-app-text">Acerca de</h3>
        {!readOnly && onEditAbout && (
          <button
            type="button"
            onClick={onEditAbout}
            className={`${sectionLinkClass} px-space-sm py-space-xs`}
          >
            Editar
          </button>
        )}
      </div>
      <div className="mt-space-sm">{content}</div>
    </section>
  );
}
