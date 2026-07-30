import AppIcon from '../common/AppIcon';
import { ICON_SIZES } from '../../constants/icons';

/** Stripe-like metric — label first, quiet icon, no decorative tone boxes. */
export default function AdminStatCard({ icon, tone: _tone, value, label }) {
  return (
    <div className="surface-card p-space-md">
      <div className="flex items-center gap-space-sm">
        {icon ? (
          <AppIcon icon={icon} size={ICON_SIZES.sm} className="shrink-0 text-app-subtle" />
        ) : null}
        <p className="truncate text-caption font-medium text-app-muted">{label}</p>
      </div>
      <p className="mt-space-md text-heading-m font-semibold tracking-tight text-app-text">
        {value ?? 0}
      </p>
    </div>
  );
}
