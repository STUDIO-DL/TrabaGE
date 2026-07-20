import AppIcon from '../../common/AppIcon';
import { ICON_COLORS, ICON_SIZES } from '../../../constants/icons';
import { SECTION_ICON_TONES } from '../../profile/ProfileIcons';
import { sectionTitleClass } from './companyProfileStyles';

export default function CompanyProfileSectionCard({
  title,
  icon,
  iconTone = 'about',
  action,
  children,
  className = '',
  id,
}) {
  const toneClass = SECTION_ICON_TONES[iconTone] ?? SECTION_ICON_TONES.about;

  return (
    <section id={id} className={`surface-card p-space-base sm:p-space-md ${className}`.trim()}>
      {(title || action) && (
        <header className="mb-space-md flex items-center justify-between gap-space-sm">
          <div className="flex min-w-0 items-center gap-space-sm">
            {icon ? (
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-radius-md sm:h-9 sm:w-9 ${toneClass}`}
                aria-hidden
              >
                <AppIcon icon={icon} size={ICON_SIZES.default} className={ICON_COLORS.default} />
              </span>
            ) : null}
            {title ? (
              typeof title === 'string' ? (
                <h3 className={`${sectionTitleClass} min-w-0 truncate`}>{title}</h3>
              ) : (
                title
              )
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
