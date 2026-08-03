import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import AdminSectionCard from '../../../components/admin/AdminSectionCard';
import { AUDIENCE_ROLE_OPTIONS, RESEND_MODE_OPTIONS } from '../domain/constants';
import { communicationsService } from '../data/communications.service';
import { formatDate } from '../../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../../utils/supabaseErrors';

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-app-surface px-3 py-2">
      <p className="text-xs text-app-subtle">{label}</p>
      <p className="text-lg font-semibold text-app-text">{value ?? '—'}</p>
    </div>
  );
}

export default function CampaignStatsModal({
  campaign,
  isOpen,
  onClose,
  showToast,
  onResent,
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    account_type: '',
    city: '',
    country: '',
    app_version: '',
    date_from: '',
    date_to: '',
  });
  const [resendMode, setResendMode] = useState('pending');
  const [resending, setResending] = useState(false);

  const load = async () => {
    if (!campaign?.id) return;
    setLoading(true);
    const payload = {
      account_type: filters.account_type || undefined,
      city: filters.city || undefined,
      country: filters.country || undefined,
      app_version: filters.app_version || undefined,
      date_from: filters.date_from ? new Date(filters.date_from).toISOString() : undefined,
      date_to: filters.date_to ? new Date(filters.date_to).toISOString() : undefined,
    };
    const { data, error } = await communicationsService.getCampaignStats(campaign.id, payload);
    setLoading(false);
    if (error) {
      showToast?.(getSupabaseErrorMessage(error), 'error');
      return;
    }
    setStats(data);
  };

  useEffect(() => {
    if (isOpen && campaign?.id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open/campaign
  }, [isOpen, campaign?.id]);

  const chartData = useMemo(
    () =>
      (stats?.responses_by_day || []).map((row) => ({
        date: row.date,
        count: row.count,
      })),
    [stats],
  );

  const handleResend = async () => {
    setResending(true);
    const { data, error } = await communicationsService.resendCampaign(
      campaign.id,
      resendMode,
      campaign.resend_interval_days,
    );
    setResending(false);
    if (error) {
      showToast?.(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast?.(`Reenviada a ${data?.updated ?? 0} usuarios.`, 'success');
    onResent?.();
    await load();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Estadísticas · ${campaign?.title || ''}`} size="lg">
      <div className="max-h-[75dvh] space-y-4 overflow-y-auto pr-1">
        <AdminSectionCard title="Filtros">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium text-app-text">
              Tipo de cuenta
              <select
                className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
                value={filters.account_type}
                onChange={(e) => setFilters((p) => ({ ...p, account_type: e.target.value }))}
              >
                <option value="">Todas</option>
                {AUDIENCE_ROLE_OPTIONS.filter((o) => o.value !== 'guest').map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <Input
              label="Ciudad"
              value={filters.city}
              onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
            />
            <Input
              label="País"
              value={filters.country}
              onChange={(e) => setFilters((p) => ({ ...p, country: e.target.value }))}
            />
            <Input
              label="Versión app"
              value={filters.app_version}
              onChange={(e) => setFilters((p) => ({ ...p, app_version: e.target.value }))}
            />
            <Input
              label="Desde"
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
            />
            <Input
              label="Hasta"
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
            />
          </div>
          <div className="mt-3">
            <Button type="button" size="sm" onClick={load} loading={loading}>
              Aplicar filtros
            </Button>
          </div>
        </AdminSectionCard>

        {stats ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Usuarios objetivo" value={stats.targeted} />
              <Stat label="Recibieron / mostrados" value={stats.shown} />
              <Stat label="Abrieron" value={stats.opened} />
              <Stat label="Pulsaron CTA" value={stats.cta_clicked} />
              <Stat label="Completaron perfil" value={stats.converted} />
              <Stat label="Tasa conversión" value={`${stats.conversion_rate ?? 0}%`} />
              <Stat label="Tasa CTA" value={`${stats.cta_rate ?? 0}%`} />
              <Stat label="Tasa apertura" value={`${stats.open_rate ?? 0}%`} />
              <Stat label="Respondieron (encuesta)" value={stats.responded} />
              <Stat label="Cerraron" value={stats.dismissed} />
              <Stat label="Pendientes" value={stats.pending} />
              <Stat label="Nota media" value={stats.avg_rating ?? '—'} />
            </div>
            {stats.conversion_goal ? (
              <p className="text-caption text-app-subtle">
                Objetivo de conversión: {stats.conversion_goal === 'profile_complete'
                  ? 'Completar perfil'
                  : 'Clic en CTA'}
              </p>
            ) : null}

            {(stats.rating_distribution || []).length ? (
              <AdminSectionCard title="Distribución de notas">
                <div className="flex flex-wrap gap-2">
                  {stats.rating_distribution.map((row) => (
                    <span
                      key={row.rating}
                      className="rounded-lg bg-primary-50 px-2.5 py-1 text-sm font-medium text-primary-700"
                    >
                      {row.rating}: {row.count}
                    </span>
                  ))}
                </div>
              </AdminSectionCard>
            ) : null}

            {chartData.length ? (
              <AdminSectionCard title="Respuestas por día">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-app-border, #e2e8f0)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </AdminSectionCard>
            ) : null}

            <AdminSectionCard title="Comentarios recibidos">
              {(stats.comments || []).length === 0 ? (
                <p className="text-sm text-app-muted">Sin comentarios todavía.</p>
              ) : (
                <ul className="space-y-3">
                  {stats.comments.slice(0, 40).map((c) => (
                    <li key={c.id} className="rounded-lg border border-app-border p-3 text-sm">
                      <div className="mb-1 flex flex-wrap gap-2 text-xs text-app-subtle">
                        {c.rating != null ? <span>Nota {c.rating}/10</span> : null}
                        {c.account_type ? <span>· {c.account_type}</span> : null}
                        {c.app_version ? <span>· v{c.app_version}</span> : null}
                        <span>· {formatDate(c.created_at)}</span>
                      </div>
                      {c.improvement_text ? (
                        <p className="text-app-text"><strong>Mejorar:</strong> {c.improvement_text}</p>
                      ) : null}
                      {c.comment_text ? (
                        <p className="mt-1 text-app-muted">{c.comment_text}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </AdminSectionCard>
          </>
        ) : (
          <p className="text-sm text-app-muted">{loading ? 'Cargando…' : 'Sin datos.'}</p>
        )}

        <AdminSectionCard title="Reenviar campaña">
          <p className="mb-3 text-xs text-app-subtle">
            Nunca se reenvía a quienes ya respondieron.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm font-medium text-app-text">
              Destinatarios
              <select
                className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
                value={resendMode}
                onChange={(e) => setResendMode(e.target.value)}
              >
                {RESEND_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <Button type="button" onClick={handleResend} loading={resending}>
              Reenviar campaña
            </Button>
          </div>
        </AdminSectionCard>
      </div>
    </Modal>
  );
}
