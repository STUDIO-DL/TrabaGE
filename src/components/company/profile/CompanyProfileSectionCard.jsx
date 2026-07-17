import { sectionCardClass, sectionTitleClass } from './companyProfileStyles';

export default function CompanyProfileSectionCard({
  title,
  action,
  children,
  className = '',
  id,
}) {
  return (
    <section id={id} className={`${sectionCardClass} ${className}`.trim()}>
      {(title || action) && (
        <div className="mb-space-sm flex items-center justify-between gap-space-sm">
          {title ? (
            typeof title === 'string' ? (
              <h3 className={sectionTitleClass}>{title}</h3>
            ) : (
              title
            )
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
