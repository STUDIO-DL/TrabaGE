import { useEffect, useState } from 'react';

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

import { Search } from '../constants/icons';

import { AvatarType, avatarTypeFromSearchEntity } from '../constants/avatarDefaults';

import {

  SEARCH_ENTITY_TYPE_LABELS,

  groupSearchResults,

} from '../utils/globalSearch';



function SearchResultItem({ item }) {

  const avatarType = avatarTypeFromSearchEntity(item.type);



  return (

    <Link

      to={item.path}

      className="flex gap-space-md border-b border-app-border p-space-base transition-colors duration-fast hover:bg-app-surface"

    >

      <AppAvatar

        type={avatarType}

        src={item.avatar_path}

        name={item.title}

        alt={item.title}

        size="sm"

        variant={avatarType === AvatarType.PERSONAL ? 'circular' : 'rounded'}

        className={

          item.type === 'company' || item.type === 'institution' || item.type === 'job'

            ? '!rounded-radius-md shrink-0'

            : 'shrink-0'

        }

      />

      <div className="min-w-0 flex-1">

        <p className="text-caption font-semibold uppercase tracking-wide text-primary-600">

          {SEARCH_ENTITY_TYPE_LABELS[item.type] ?? 'Resultado'}

        </p>

        <p className="mt-space-xs truncate text-body font-semibold text-app-text">{item.title}</p>

        {item.subtitle && (

          <p className="mt-space-xs truncate text-body-small text-app-muted">{item.subtitle}</p>

        )}

      </div>

    </Link>

  );

}



export default function SearchResults() {
  const [searchParams] = useSearchParams();

  const { user, role } = useAuth();

  const { profile } = useProfile();

  const query = searchParams.get('q');



  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(true);

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



  useEffect(() => {

    if (!query?.trim()) {

      setResults([]);

      setLoading(false);

      return undefined;

    }



    let cancelled = false;



    const performSearch = async () => {

      setLoading(true);

      const matchingContext =

        role === ROLES.PERSONAL && profile

          ? { userProfile: profile }

          : isEmployerRole(role) && companyJobs.length

            ? { companyJobs }

            : null;



      const { data } = await searchService.search({

        query,

        user: user ? { id: user.id, role } : null,

        matchingContext,

      });



      if (!cancelled) {

        setResults(data || []);

        setLoading(false);

      }

    };



    performSearch();



    return () => {

      cancelled = true;

    };

  }, [companyJobs, profile, query, role, user]);



  const groupedResults = groupSearchResults(results);



  const renderResults = () => {

    if (loading) return <SearchResultsSkeleton count={6} />;

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

          <SearchResultItem key={`${item.type}-${item.id}`} item={item} />

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

        renderResults()

      )}

    </PageContainer>

  );

}

