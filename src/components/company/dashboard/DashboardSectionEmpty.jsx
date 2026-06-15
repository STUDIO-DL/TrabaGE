import { Link } from 'react-router-dom';
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
      {icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50">
          <AppIcon icon={icon} size={ICON_SIZES.lg} className="text-gray-300" />
        </span>
      )}
      <p className="mt-4 text-sm font-medium text-gray-900">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-[280px] text-sm leading-relaxed text-gray-500">{description}</p>
      )}
    </div>
  );
}
