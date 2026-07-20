import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import AppAvatar from '../../components/common/AppAvatar';
import AppIcon from '../../components/common/AppIcon';
import Card from '../../components/ui/Card';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import { AvatarType } from '../../constants/avatarDefaults';
import { Briefcase, ChevronRight, ICON_SIZES } from '../../constants/icons';
import { discoverService } from '../../services/discover.service';

export default function HiringCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await discoverService.getHiringCompanies({ limit: 50 });
    if (fetchError) setError('No se pudieron cargar las empresas.');
    setCompanies(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiscoverSectionPage
      title="Empresas contratando"
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={!loading && !error && companies.length === 0}
      emptyIcon={Briefcase}
      emptyTitle="Ninguna empresa contratando ahora"
      emptyDescription="Vuelve pronto o explora otras oportunidades en Descubrir."
    >
      {companies.map((company) => {
            const vacancies = company.active_jobs_count ?? 0;
            const label = vacancies === 1 ? '1 vacante activa' : `${vacancies} vacantes activas`;

            return (
              <Link key={company.company_id} to={`/companies/${company.company_id}`}>
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
                    <p className="text-body-small text-app-muted">{label}</p>
                    {company.sector ? (
                      <p className="text-caption text-app-muted">{company.sector}</p>
                    ) : null}
                  </div>
                  <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} className="shrink-0 text-app-muted" />
                </Card>
              </Link>
            );
          })}
    </DiscoverSectionPage>
  );
}
