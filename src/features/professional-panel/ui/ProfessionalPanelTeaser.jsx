import { useNavigate } from 'react-router-dom';
import AppIcon from '../../../components/common/AppIcon';
import { ChartColumn, ChevronRight, ICON_SIZES } from '../../../constants/icons';
import { useProfessionalPanel } from '../hooks/useProfessionalPanel';
import { buildProfessionalTeaser } from '../domain/teaserCopy';
import { resolveProfessionalPanelPeriod } from '../domain/periods';

/**
 * Compact LinkedIn-style entry to the private Professional Panel.
 * Render only for the profile owner (caller must gate with isOwn).
 */
export default function ProfessionalPanelTeaser() {
  const navigate = useNavigate();
  const { data, loading } = useProfessionalPanel({ periodId: '30d', enabled: true });
  const { days } = resolveProfessionalPanelPeriod('30d');
  const { insight, growthPct } = buildProfessionalTeaser(data?.summary, { days });

  return (
    <button
      type="button"
      onClick={() => navigate('/personal/profile/professional-panel')}
      className="mt-space-sm flex w-full items-center gap-space-sm rounded-radius-md border border-app-border bg-app-surface px-space-sm py-space-sm text-left transition-colors duration-fast hover:bg-app-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      aria-label="Abrir Panel profesional"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-md bg-app-card ring-1 ring-app-border">
        <AppIcon icon={ChartColumn} size={ICON_SIZES.md} className="text-app-text" />
      </span>

      <span className="min-w-0 flex-1 py-0.5">
        <span className="block text-label font-semibold leading-tight text-app-text">
          Panel profesional
        </span>
        <span className="mt-0.5 block line-clamp-2 text-caption leading-snug text-app-muted">
          {loading ? 'Cargando estadísticas…' : insight}
        </span>
        {!loading && growthPct != null ? (
          <span className="mt-0.5 block truncate text-caption font-medium leading-snug text-success-600">
            ↗ +{growthPct}% respecto al periodo anterior
          </span>
        ) : null}
      </span>

      <AppIcon
        icon={ChevronRight}
        size={ICON_SIZES.sm}
        className="shrink-0 text-app-subtle"
        aria-hidden
      />
    </button>
  );
}
