import { useEffect, useState, useCallback } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

import { searchService } from '../services/search.service';

import { jobsService } from '../services/jobs.service';

import { ROLES, isEmployerRole } from '../constants/roles';

import PageContainer from '../components/layout/PageContainer';

import EmptyState from '../components/common/EmptyState';

import AppAvatar from '../components/common/AppAvatar';

import { SearchResultsSkeleton } from '../components/common/Skeleton';

import DirectoryBrandDisclaimer from '../components/legal/DirectoryBrandDisclaimer';
import SearchSelfBadge from '../components/search/SearchSelfBadge';
import { useIsSearchSelf } from '../components/search/useIsSearchSelf';

import { Search } from '../constants/icons';

import { AvatarType, avatarTypeFromSearchEntity } from '../constants/avatarDefaults';

import {

  SEARCH_ENTITY_TYPE_LABELS,

  groupSearchResults,

} from '../utils/globalSearch';
import { resolveSearchResultPath } from '../utils/profileRoutes';



function SearchResultItem({ item, viewer }) {
  const avatarType = avatarTypeFromSearchEntity(item.type);
  const isSelf = useIsSearchSelf(item);
  const path = item.path ?? resolveSearchResultPath(item, viewer);
  const isOrgAvatar =
    item.type === 'company' ||
    item.type === 'institution' ||
    item.type === 'business' ||
    item.type === 'organization' ||
    item.type === 'job';

  return (
    <Link
      to={path}
      className={[
        'flex gap-space-md border-b border-app-border p-space-base transition-colors duration-fast hover:bg-app-surface',
        isSelf ? 'bg-primary-50/60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AppAvatar
        type={avatarType}
        src={item.avatar_path}
        name={item.title}
        alt={isSelf ? 'Tú' : item.title}
        size="sm"
        variant={avatarType === AvatarType.PERSONAL ? 'circular' : 'rounded'}
        className={isOrgAvatar ? '!rounded-radius-md shrink-0' : 'shrink-0'}
      />

      <div className="min-w-0 flex-1">
        <p className="text-caption font-semibold uppercase tracking-wide text-primary-600">
          {isSelf ? 'Tu perfil' : (SEARCH_ENTITY_TYPE_LABELS[item.type] ?? 'Resultado')}
        </p>

        <div className="mt-space-xs flex min-w-0 items-center gap-space-sm">
          <p className="truncate text-body font-semibold text-app-text">
            {isSelf ? 'Tú' : item.title}
          </p>
          {isSelf ? <SearchSelfBadge /> : null}
        </div>

        {isSelf ? (
          <p className="mt-space-xs truncate text-body-small text-app-muted">{item.title}</p>
        ) : null}

        {item.subtitle ? (
          <p className="mt-space-xs truncate text-body-small text-app-muted">{item.subtitle}</p>
        ) : null}
      </div>
    </Link>
  );
}



export default function SearchResults() {
  const [searchParams] = useSearchParams();

  const { user, role } = useAuth();

  const { profile } = useProfile();
  const viewer = user ? { id: user.id, role } : null;

  const query = searchParams.get('q');



  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [companyJobs, setCompanyJobs] = useState([]);



  useEffect(() => {

    if (!isEmployerRole(role) || !user?.id) {

      setCompanyJobs([]);

      return;

    }



    jobsService.getCompanyJobs(user.id).then(({ data }) => {

      setCompanyJobs((data ?? []).filter((job) => job.status === 'active'));

    });

  }, [role, user?.id]);



  const performSearch = useCallback(async () => {
    if (!query?.trim()) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const matchingContext =
      role === ROLES.PERSONAL && profile
        ? { userProfile: profile }
        : isEmployerRole(role) && companyJobs.length
          ? { companyJobs }
          : null;

    const { data, error: searchError } = await searchService.search({
      query,
      user: user ? { id: user.id, role } : null,
      matchingContext,
    });

    if (searchError) {
      setResults([]);
      setError(searchError.message || 'No se pudo completar la búsqueda.');
      setLoading(false);
      return;
    }

    setResults(data || []);
    setLoading(false);
  }, [companyJobs, profile, query, role, user]);

  useEffect(() => {
    void performSearch();
  }, [performSearch]);

  const groupedResults = groupSearchResults(results);



  const renderResults = () => {
    if (loading) return <SearchResultsSkeleton count={6} />;

    if (error) {
      return (
        <div
          className="mx-space-base my-space-md rounded-radius-lg border border-error-100 bg-error-50 px-space-base py-space-md text-body-small text-error-800"
          role="alert"
        >
          <p>No se pudo cargar la búsqueda. Inténtalo de nuevo.</p>
          <button
            type="button"
            onClick={performSearch}
            className="mt-space-sm font-medium text-error-700 underline transition-colors duration-fast hover:text-error-900"
            aria-label="Reintentar búsqueda"
          >
            Reintentar
          </button>
        </div>
      );
    }

    if (results.length === 0) {

      return (

        <EmptyState

          variant="soft"

          icon={Search}

          title="Sin resultados"

          description="Prueba con otro término o revisa la ortografía."

        />

      );

    }



    return groupedResults.map((group) => (

      <section key={group.type} className="border-b border-app-border last:border-b-0">

        <h2 className="bg-app-surface px-space-base py-space-sm text-caption font-semibold uppercase tracking-wide text-app-muted">

          {group.label}

        </h2>

        {group.items.map((item) => (

          <SearchResultItem key={`${item.type}-${item.id}`} item={item} viewer={viewer} />

        ))}

      </section>

    ));

  };



  return (

    <PageContainer

      backButton

      bottomNav={false}

      actions={

        query ? (

          <span className="max-w-[10rem] truncate text-body-small text-app-muted">{query}</span>

        ) : null

      }

    >

      {!query ? (

        <EmptyState

          variant="soft"

          icon={Search}

          title="Busca en TrabaGE"

          description="Escribe algo para encontrar personas, cuentas Business u organizaciones."

        />

      ) : (

        <>

          {renderResults()}

          {!loading && results.length > 0 ? <DirectoryBrandDisclaimer /> : null}

        </>

      )}

    </PageContainer>

  );

}

