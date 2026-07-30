import { sectionTitleClass } from './companyProfileStyles';
import { profileSectionCardClass } from '../../profile/profileLayoutClasses';

/**
 * Company/organization profile section shell.
 * Same visual language as candidate ProfileSectionCard (independent cards).
 */
export default function CompanyProfileSectionCard({
  title,
  icon: _icon,
  iconTone: _iconTone,
  action,
  children,
  className = '',
  id,
}) {
  const scrollClass = id ? ' scroll-mt-24' : '';

  return (
    <section
      id={id}
      className={`${profileSectionCardClass}${scrollClass} ${className}`.trim()}
    >
      {(title || action) && (
        <header className="mb-space-md flex items-center justify-between gap-space-sm">
          {title ? (
            typeof title === 'string' ? (
              <h3 className={`${sectionTitleClass} min-w-0 flex-1 truncate`}>{title}</h3>
            ) : (
              <div className="min-w-0 flex-1">{title}</div>
            )
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
