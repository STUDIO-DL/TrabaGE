import verifiedBadge from '../../assets/badges/verified-badge.png';

const SIZE_MAP = {
  sm: 16,
  md: 20,
  lg: 24,
};

export default function VerifiedBadge({
  size = 'sm',
  className = '',
  showTooltip = true,
  tooltip = 'Empresa Verificada',
}) {
  const pixels = SIZE_MAP[size] ?? SIZE_MAP.sm;

  return (
    <span
      className={`inline-flex shrink-0 items-center ${className}`}
      title={showTooltip ? tooltip : undefined}
      aria-label={tooltip}
      role="img"
    >
      <img
        src={verifiedBadge}
        alt=""
        width={pixels}
        height={pixels}
        className="block object-contain"
        draggable={false}
      />
    </span>
  );
}
