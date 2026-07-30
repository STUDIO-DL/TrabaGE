import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import { ChevronRight, ICON_SIZES } from '../../../constants/icons';
import { formatDeltaPct } from '../../../features/company-dashboard/dashboardFormatters';

/**
 * Neutral metric row — Stripe-like density, no decorative color tones.
 */
export default function DashboardStatCard({
  icon,
  tone: _tone,
  value,
  label,
  deltaPct,
  linkLabel,
  to,
  loading = false,
}) {
  const delta = formatDeltaPct(deltaPct);

  return (
    <div className="surface-card p-space-md">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-space-sm">
          {icon ? (
            <AppIcon icon={icon} size={ICON_SIZES.sm} className="shrink-0 text-app-subtle" />
          ) : null}
          <p className="truncate text-caption font-medium text-app-muted">{label}</p>
        </div>
        {to ? (
          <Link
            to={to}
            className="inline-flex shrink-0 items-center gap-0.5 text-caption font-medium text-app-muted transition-colors hover:text-primary-600"
          >
            {linkLabel}
            <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} />
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-space-md space-y-space-sm" aria-hidden>
          <div className="h-7 w-14 animate-pulse rounded-radius-sm bg-app-border/50" />
          <div className="h-3 w-20 animate-pulse rounded-radius-sm bg-app-border/30" />
        </div>
      ) : (
        <>
          <p className="mt-space-md text-heading-m font-semibold tracking-tight text-app-text">
            {value ?? 0}
          </p>
          <p
            className={[
              'mt-space-xs text-caption font-medium',
              delta.tone === 'positive'
                ? 'text-success-600'
                : delta.tone === 'negative'
                  ? 'text-error-600'
                  : 'text-app-subtle',
            ].join(' ')}
          >
            {delta.text}
            {delta.tone === 'positive' || delta.tone === 'negative' ? (
              <span className="font-normal text-app-subtle"> vs semana anterior</span>
            ) : null}
          </p>
        </>
      )}
    </div>
  );
}
