import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import AppAvatar from '../../components/common/AppAvatar';
import AppIcon from '../../components/common/AppIcon';
import Card from '../../components/ui/Card';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import { AvatarType } from '../../constants/avatarDefaults';
import { Building2, ChevronRight, ICON_SIZES } from '../../constants/icons';
import { discoverService } from '../../services/discover.service';
import { formatRelativeTime } from '../../utils/formatDate';

export default function NewCompanies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await discoverService.getNewCompanies();
    if (fetchError) setError('No se pudieron cargar las empresas.');
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiscoverSectionPage
      title="Nuevas empresas"
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={!loading && !error && items.length === 0}
      emptyIcon={Building2}
      emptyTitle="No hay empresas nuevas"
      emptyDescription="Las empresas registradas recientemente aparecerán aquí."
    >
      {items.map((company) => (
        <Link key={company.user_id} to={`/companies/${company.user_id}`}>
          <Card elevation={1} className="flex items-center gap-space-md p-space-md transition-colors hover:bg-app-surface">
            <AppAvatar
              type={AvatarType.BUSINESS}
              src={company.logo_path}
              name={company.company_name}
              alt={company.company_name}
              size="md"
              variant="rounded"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-app-text">{company.company_name}</p>
              {company.sector ? <p className="text-body-small text-app-muted">{company.sector}</p> : null}
              {company.created_at ? (
                <p className="text-caption text-app-muted">Registrada {formatRelativeTime(company.created_at)}</p>
              ) : null}
            </div>
            <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} className="shrink-0 text-app-muted" />
          </Card>
        </Link>
      ))}
    </DiscoverSectionPage>
  );
}
