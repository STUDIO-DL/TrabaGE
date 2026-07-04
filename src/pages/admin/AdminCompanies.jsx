import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { getCompanyLogoUrl } from '../../constants/images';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function AdminCompanies() {
  const { showToast } = useNotificationContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getCompanies();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setCompanies(data ?? []);
    setLoading(false);
  }, [showToast]);

  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return companies;

    return companies.filter((company) =>
      [
        company.company_name,
        company.city,
        company.sector,
        company.company_type,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [companies, query]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleToggleActive = useCallback(async (company) => {
    setActionId(company.user_id);
    const nextActive = !company.is_active;
    const { error } = await adminService.setCompanyActive(company.user_id, nextActive);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast(nextActive ? 'Empresa reactivada' : 'Empresa desactivada', 'success');
    await loadCompanies();
  }, [loadCompanies, showToast]);

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
    [actionId, handleToggleActive],
  );

  return (
    <div className="space-y-4">
      <Input
        label="Buscar empresas"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre, ciudad, sector o tipo"
      />
      <AdminTable
        columns={columns}
        rows={filteredCompanies.map((company) => ({ ...company, id: company.user_id }))}
        loading={loading}
        emptyMessage="No hay empresas registradas."
      />
    </div>
  );
}
