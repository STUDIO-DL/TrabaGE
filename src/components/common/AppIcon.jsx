import { ICON_SIZES } from '../../constants/icons';

/**
 * Reusable Lucide icon wrapper.
 * Icons inherit text color from className (e.g. text-primary-600, text-slate-500).
 */
export default function AppIcon({
  icon: Icon,
  size = ICON_SIZES.default,
  className = '',
  strokeWidth = 2,
  'aria-hidden': ariaHidden = true,
  ...props
}) {
  if (!Icon) return null;

  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className}`}
      aria-hidden={ariaHidden}
      {...props}
    />
  );
}
