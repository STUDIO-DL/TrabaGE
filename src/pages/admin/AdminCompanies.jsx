import { useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { getCompanyLogoUrl } from '../../constants/images';
import { formatDate } from '../../utils/formatDate';

export default function AdminCompanies() {
  const { showToast } = useNotificationContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const loadCompanies = async () => {
    setLoading(true);
    const { data, error } = await adminService.getCompanies();
    if (error) showToast(error.message, 'error');
    setCompanies(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleToggleActive = async (company) => {
    setActionId(company.user_id);
    const nextActive = !company.is_active;
    const { error } = await adminService.setCompanyActive(company.user_id, nextActive);
    setActionId(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(nextActive ? 'Empresa reactivada' : 'Empresa desactivada', 'success');
    await loadCompanies();
  };

  const columns = useMemo(
    () => [
      {
        key: 'logo',
        label: 'Logo',
        render: (row) => (
          <img
            src={getCompanyLogoUrl(row.logo_path)}
            alt=""
            className="h-9 w-9 rounded-xl object-cover"
          />
        ),
      },
      { key: 'company_name', label: 'Empresa' },
      { key: 'city', label: 'Ciudad', render: (row) => row.city || '—' },
      {
        key: 'verified',
        label: 'Verificada',
        render: (row) => (
          <AdminStatusBadge
            status={row.is_verified ? 'verified' : 'unverified'}
            label={row.is_verified ? 'Sí' : 'No'}
          />
        ),
      },
      {
        key: 'created_at',
        label: 'Creada',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                window.open(`/companies/${row.user_id}`, '_blank', 'noopener,noreferrer')
              }
            >
              Ver
            </Button>
            <Button
              size="sm"
              variant={row.is_active ? 'danger' : 'primary'}
              loading={actionId === row.user_id}
              onClick={() => handleToggleActive(row)}
            >
              {row.is_active ? 'Desactivar' : 'Reactivar'}
            </Button>
          </div>
        ),
      },
    ],
    [actionId],
  );

  return (
    <AdminTable
      columns={columns}
      rows={companies.map((company) => ({ ...company, id: company.user_id }))}
      loading={loading}
      emptyMessage="No hay empresas registradas."
    />
  );
}
