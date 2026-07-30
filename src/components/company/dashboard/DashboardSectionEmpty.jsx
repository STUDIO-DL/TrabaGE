import AppIcon from '../../common/AppIcon';
import { ICON_SIZES } from '../../../constants/icons';

export default function DashboardSectionEmpty({
  icon,
  title,
  description,
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'px-5 py-10' : 'min-h-[240px] px-5 py-12'
      }`}
    >
      {icon ? (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-surface text-app-subtle ring-1 ring-app-border">
          <AppIcon icon={icon} size={ICON_SIZES.lg} />
        </span>
      ) : null}
      <p className="mt-4 text-sm font-medium text-app-text">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-[280px] text-sm leading-relaxed text-app-muted">{description}</p>
      ) : null}
    </div>
  );
}
