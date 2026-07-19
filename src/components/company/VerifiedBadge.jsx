const SIZE_MAP = {
  sm: 14,
  md: 16,
  lg: 20,
};

/**
 * Instagram-style inline verification badge — small filled circle with checkmark.
 * No background box; sits flush beside the display name.
 */
export default function VerifiedBadge({
  size = 'sm',
  className = '',
  showTooltip = true,
  tooltip = 'Cuenta verificada',
  verified = true,
}) {
  const pixels = SIZE_MAP[size] ?? SIZE_MAP.sm;
  const fillClass = verified ? 'text-primary-500' : 'text-app-border';
  const checkClass = verified ? 'text-white' : 'text-app-subtle';

  return (
    <span
      className={`inline-flex shrink-0 items-center align-middle leading-none ${className}`}
      title={showTooltip ? tooltip : undefined}
      aria-label={tooltip}
      role="img"
    >
      <svg
        width={pixels}
        height={pixels}
        viewBox="0 0 24 24"
        aria-hidden
        className="block"
      >
        <circle cx="12" cy="12" r="12" className={fillClass} fill="currentColor" />
        <path
          d="M7.5 12.2l2.8 2.8 6.2-6.4"
          className={checkClass}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
