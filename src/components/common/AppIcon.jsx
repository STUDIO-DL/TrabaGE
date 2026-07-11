import { ICON_SIZES, ICON_STROKE } from '../../constants/icons';

/**
 * Reusable Lucide icon wrapper (single icon family).
 * Prefer ICON_SIZES.sm|md|lg|xl. Icons inherit color via text-* classes.
 */
export default function AppIcon({
  icon: Icon,
  size = ICON_SIZES.md,
  className = '',
  strokeWidth = ICON_STROKE.default,
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
