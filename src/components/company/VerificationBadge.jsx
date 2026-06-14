import Badge from '../ui/Badge';

const STATUS_MAP = {
  verified: { variant: 'verified', label: 'Verificada' },
  pending: { variant: 'pending', label: 'Pendiente' },
  rejected: { variant: 'error', label: 'Rechazada' },
  unverified: null,
};

export default function VerificationBadge({ status = 'unverified' }) {
  const config = STATUS_MAP[status];
  if (!config) return null;
  return <Badge variant={config.variant} label={config.label} />;
}
