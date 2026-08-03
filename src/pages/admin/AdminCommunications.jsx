import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import AdminConfirmModal from '../../components/admin/AdminConfirmModal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppIcon from '../../components/common/AppIcon';
import {
  Copy,
  Pencil,
  Plus,
  ChartColumn,
  Trash2,
  EyeOff,
  ICON_SIZES,
} from '../../constants/icons';
import { useNotificationContext } from '../../context/NotificationContext';
import useAdminTable from '../../hooks/useAdminTable';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import {
  communicationsService,
  emptyCampaignForm,
  campaignToForm,
  formatAudienceLabel,
  formatCampaignType,
  LIFECYCLE_LABELS,
} from '../../features/communications';
import CampaignFormModal from '../../features/communications/admin/CampaignFormModal';
import CampaignStatsModal from '../../features/communications/admin/CampaignStatsModal';

const LIFECYCLE_BADGE = {
  active: 'active',
  scheduled: 'pending',
  ended: 'resolved',
  inactive: 'inactive',
};

export default function AdminCommunications() {
  const { showToast } = useNotificationContext();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statsCampaign, setStatsCampaign] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await communicationsService.listCampaigns();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setCampaigns(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const {
    rows,
    totalRows,
    page,
    setPage,
    totalPages,
    pageSize,
    sortKey,
    sortDir,
    toggleSort,
    resetPage,
  } = useAdminTable(campaigns, {
    searchQuery: query,
    searchKeys: ['title', 'campaign_type', 'lifecycle_status'],
    defaultSortKey: 'created_at',
    defaultSortDir: 'desc',
  });

  const openCreate = () => {
    setForm(emptyCampaignForm());
    setFormOpen(true);
  };

  const openEdit = (campaign) => {
    setForm(campaignToForm(campaign));
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form?.title?.trim()) {
      showToast('El título es obligatorio.', 'error');
      return;
    }
    setSaving(true);
    const { error } = await communicationsService.upsertCampaign(form);
    setSaving(false);
    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo guardar.'), 'error');
      return;
    }
    showToast(form.id ? 'Campaña actualizada.' : 'Campaña creada.', 'success');
    setFormOpen(false);
    setForm(null);
    await load();
  };

  const handleDuplicate = async (campaign) => {
    setActionId(campaign.id);
    const { error } = await communicationsService.duplicateCampaign(campaign.id);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Campaña duplicada.', 'success');
    await load();
  };

  const handleToggleActive = async (campaign) => {
    setActionId(campaign.id);
    const { error } = await communicationsService.setCampaignActive(
      campaign.id,
      !campaign.is_active,
    );
    setActionId(null);
    setConfirm(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast(campaign.is_active ? 'Campaña desactivada.' : 'Campaña activada.', 'success');
    await load();
  };

  const handleDelete = async (campaign) => {
    setActionId(campaign.id);
    const { error } = await communicationsService.deleteCampaign(campaign.id);
    setActionId(null);
    setConfirm(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Campaña eliminada.', 'success');
    await load();
  };

  const columns = useMemo(
    () => [
      {
        key: 'status',
        label: 'Estado',
        sortKey: 'lifecycle_status',
        sortable: true,
        render: (row) => (
          <AdminStatusBadge
            status={LIFECYCLE_BADGE[row.lifecycle_status] || 'inactive'}
            label={LIFECYCLE_LABELS[row.lifecycle_status] || row.lifecycle_status}
          />
        ),
      },
      {
        key: 'type',
        label: 'Tipo',
        sortKey: 'campaign_type',
        sortable: true,
        render: (row) => formatCampaignType(row.campaign_type),
      },
      {
        key: 'title',
        label: 'Título',
        sortKey: 'title',
        sortable: true,
        render: (row) => (
          <span className="font-medium text-app-text">{row.title}</span>
        ),
      },
      {
        key: 'audience',
        label: 'Público',
        render: (row) => formatAudienceLabel(row.audience),
      },
      {
        key: 'starts_at',
        label: 'Inicio',
        sortKey: 'starts_at',
        sortable: true,
        render: (row) => formatDate(row.starts_at),
      },
      {
        key: 'ends_at',
        label: 'Fin',
        sortKey: 'ends_at',
        sortable: true,
        render: (row) => (row.ends_at ? formatDate(row.ends_at) : '—'),
      },
      {
        key: 'targeted',
        label: 'Objetivo',
        render: (row) => row.stats?.targeted ?? 0,
      },
      {
        key: 'responded',
        label: 'Respondidos',
        render: (row) => row.stats?.responded ?? 0,
      },
      {
        key: 'pending',
        label: 'Pendientes',
        render: (row) => row.stats?.pending ?? 0,
      },
      {
        key: 'dismissed',
        label: 'Cerrados',
        render: (row) => row.stats?.dismissed ?? 0,
      },
      {
        key: 'cta',
        label: 'CTA',
        render: (row) => row.stats?.cta_clicked ?? 0,
      },
      {
        key: 'converted',
        label: 'Convertidos',
        render: (row) => row.stats?.converted ?? 0,
      },
      {
        key: 'rate',
        label: 'Tasa resp.',
        render: (row) => `${row.stats?.response_rate ?? 0}%`,
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="rounded-md p-1.5 text-app-muted hover:bg-app-surface hover:text-primary-600"
              title="Editar"
              onClick={() => openEdit(row)}
            >
              <AppIcon icon={Pencil} size={ICON_SIZES.sm} />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-app-muted hover:bg-app-surface hover:text-primary-600"
              title="Duplicar"
              disabled={actionId === row.id}
              onClick={() => handleDuplicate(row)}
            >
              <AppIcon icon={Copy} size={ICON_SIZES.sm} />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-app-muted hover:bg-app-surface hover:text-primary-600"
              title={row.is_active ? 'Desactivar' : 'Activar'}
              onClick={() =>
                setConfirm({
                  type: 'toggle',
                  campaign: row,
                  title: row.is_active ? 'Desactivar campaña' : 'Activar campaña',
                  message: row.is_active
                    ? 'Los usuarios dejarán de ver esta campaña.'
                    : 'La campaña volverá a mostrarse según su vigencia.',
                })
              }
            >
              <AppIcon icon={EyeOff} size={ICON_SIZES.sm} />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-app-muted hover:bg-app-surface hover:text-primary-600"
              title="Estadísticas"
              onClick={() => setStatsCampaign(row)}
            >
              <AppIcon icon={ChartColumn} size={ICON_SIZES.sm} />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-app-muted hover:bg-error-50 hover:text-error-600"
              title="Eliminar"
              onClick={() =>
                setConfirm({
                  type: 'delete',
                  campaign: row,
                  title: 'Eliminar campaña',
                  message: 'Se eliminarán estados, respuestas e historial asociados. Esta acción no se puede deshacer.',
                })
              }
            >
              <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
            </button>
          </div>
        ),
      },
    ],
    [actionId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Centro de Comunicaciones</h2>
          <p className="mt-1 text-sm text-app-muted">
            Campañas oficiales entre TrabaGE y los usuarios: anuncios, feedback, legal y más.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="inline-flex items-center gap-2">
          <AppIcon icon={Plus} size={ICON_SIZES.sm} />
          Nueva campaña
        </Button>
      </div>

      <Input
        label="Buscar"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          resetPage();
        }}
        placeholder="Título, tipo o estado…"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="Aún no hay campañas. Crea la primera para empezar."
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        page={page}
        totalPages={totalPages}
        totalRows={totalRows}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      <CampaignFormModal
        isOpen={formOpen}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={() => {
          setFormOpen(false);
          setForm(null);
        }}
        onSave={handleSave}
      />

      <CampaignStatsModal
        campaign={statsCampaign}
        isOpen={Boolean(statsCampaign)}
        onClose={() => setStatsCampaign(null)}
        showToast={showToast}
        onResent={load}
      />

      <AdminConfirmModal
        isOpen={Boolean(confirm)}
        title={confirm?.title}
        description={confirm?.message}
        confirmLabel={confirm?.type === 'delete' ? 'Eliminar' : 'Confirmar'}
        variant={confirm?.type === 'delete' ? 'danger' : 'primary'}
        loading={actionId === confirm?.campaign?.id}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm?.campaign) return;
          if (confirm.type === 'delete') void handleDelete(confirm.campaign);
          else void handleToggleActive(confirm.campaign);
        }}
      />
    </div>
  );
}
