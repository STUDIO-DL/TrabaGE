import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatCard from '../../components/admin/AdminStatCard';
import AdminSectionCard from '../../components/admin/AdminSectionCard';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Input from '../../components/ui/Input';
import {
  Globe,
  Trash2,
  TrendingUp,
  Users,
} from '../../constants/icons';
import {
  getAccountDeletionReasonLabel,
  getAccountTypeLabel,
} from '../../constants/accountDeletionReasons';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function formatAccountAge(days) {
  if (days == null) return '—';
  if (days < 1) return 'Menos de 1 día';
  if (days === 1) return '1 día';
  if (days < 30) return `${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 mes' : `${months} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 año' : `${years} años`;
}

function formatMonthLabel(month) {
  if (!month || typeof month !== 'string') return month ?? '—';
  const [y, m] = month.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

function formatDeletedAt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return formatDate(value);
  }
}

function StatBars({ items, labelKey, valueKey = 'count', formatLabel }) {
  const max = Math.max(1, ...items.map((i) => Number(i[valueKey]) || 0));

  if (!items.length) {
    return <p className="text-body-small text-app-muted">Sin datos todavía.</p>;
  }

  return (
    <ul className="space-y-space-sm">
      {items.map((item) => {
        const count = Number(item[valueKey]) || 0;
        const rawLabel = item[labelKey];
        const label = formatLabel ? formatLabel(rawLabel) : rawLabel;
        const pct = Math.round((count / max) * 100);
        return (
          <li key={`${labelKey}-${rawLabel}`}>
            <div className="mb-1 flex items-center justify-between gap-space-sm text-caption">
              <span className="truncate font-medium text-app-text">{label}</span>
              <span className="shrink-0 tabular-nums text-app-muted">{count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-radius-circular bg-app-surface">
              <div
                className="h-full rounded-radius-circular bg-primary-600 transition-all duration-fast ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminDeletedAccounts() {
  const { showToast } = useNotificationContext();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [listResult, statsResult] = await Promise.all([
      adminService.getDeletedAccounts(),
      adminService.getDeletedAccountsStats(),
    ]);

    if (listResult.error) showToast(getSupabaseErrorMessage(listResult.error), 'error');
    if (statsResult.error) showToast(getSupabaseErrorMessage(statsResult.error), 'error');

    setRows(listResult.data ?? []);
    setStats(statsResult.data);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;

    return rows.filter((row) =>
      [
        getAccountDeletionReasonLabel(row.reason_code),
        row.reason_other,
        row.improvement_comment,
        getAccountTypeLabel(row.account_type),
        row.country,
        row.city,
        row.rating,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const columns = useMemo(
    () => [
      {
        key: 'deleted_at',
        label: 'Fecha',
        render: (row) => (
          <span className="whitespace-nowrap text-body-small">{formatDeletedAt(row.deleted_at)}</span>
        ),
      },
      {
        key: 'reason',
        label: 'Motivo',
        render: (row) => (
          <div className="max-w-xs">
            <p className="text-body-small font-medium text-app-text">
              {getAccountDeletionReasonLabel(row.reason_code)}
            </p>
            {row.reason_other ? (
              <p className="mt-0.5 truncate text-caption text-app-muted">{row.reason_other}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'rating',
        label: 'Nota',
        render: (row) =>
          row.rating != null ? (
            <AdminStatusBadge status="active" label={`${row.rating}/10`} />
          ) : (
            <span className="text-app-subtle">—</span>
          ),
      },
      {
        key: 'account_type',
        label: 'Tipo',
        render: (row) => getAccountTypeLabel(row.account_type),
      },
      {
        key: 'location',
        label: 'Ubicación',
        render: (row) => {
          const parts = [row.city, row.country].filter(Boolean);
          return parts.length ? parts.join(', ') : '—';
        },
      },
      {
        key: 'age',
        label: 'Antigüedad',
        render: (row) => formatAccountAge(row.account_age_days),
      },
      {
        key: 'activity',
        label: 'Actividad',
        render: (row) => (
          <span className="text-caption text-app-muted">
            {row.posts_count ?? 0} pub. · {row.applications_count ?? 0} cand. ·{' '}
            {row.followers_count ?? 0} seg.
          </span>
        ),
      },
      {
        key: 'improvement',
        label: 'Comentario',
        render: (row) => (
          <span className="block max-w-xs truncate text-app-muted">
            {row.improvement_comment || '—'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-space-lg">
      <div className="grid grid-cols-2 gap-space-md lg:grid-cols-4">
        <AdminStatCard
          icon={Trash2}
          label="Cuentas eliminadas"
          value={loading ? '…' : stats?.total ?? 0}
        />
        <AdminStatCard
          icon={TrendingUp}
          label="Calificación media"
          value={loading ? '…' : stats?.avgRating != null ? `${stats.avgRating}/10` : '—'}
        />
        <AdminStatCard
          icon={Users}
          label="Tipos distintos"
          value={loading ? '…' : stats?.byAccountType?.length ?? 0}
        />
        <AdminStatCard
          icon={Globe}
          label="Países"
          value={loading ? '…' : stats?.byCountry?.length ?? 0}
        />
      </div>

      <div className="grid gap-space-md lg:grid-cols-2">
        <AdminSectionCard title="Motivos más frecuentes">
          <StatBars
            items={stats?.byReason ?? []}
            labelKey="code"
            formatLabel={getAccountDeletionReasonLabel}
          />
        </AdminSectionCard>
        <AdminSectionCard title="Eliminaciones por tipo de cuenta">
          <StatBars
            items={stats?.byAccountType ?? []}
            labelKey="account_type"
            formatLabel={getAccountTypeLabel}
          />
        </AdminSectionCard>
        <AdminSectionCard title="Eliminaciones por mes">
          <StatBars
            items={stats?.byMonth ?? []}
            labelKey="month"
            formatLabel={formatMonthLabel}
          />
        </AdminSectionCard>
        <AdminSectionCard title="Eliminaciones por país">
          <StatBars items={stats?.byCountry ?? []} labelKey="country" />
        </AdminSectionCard>
      </div>

      <div className="space-y-space-md">
        <div className="flex flex-col gap-space-sm sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-body font-semibold text-app-text">Historial</h2>
          <div className="w-full max-w-xs sm:w-56">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              aria-label="Buscar cuentas eliminadas"
            />
          </div>
        </div>
        <AdminTable
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyMessage="Aún no hay cuentas eliminadas con encuesta de salida."
        />
      </div>
    </div>
  );
}
