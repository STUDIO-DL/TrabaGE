import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { searchService } from '../services/search.service';
import { jobsService } from '../services/jobs.service';
import { ROLES } from '../constants/roles';
import MobileScreenLayout from '../components/layout/MobileScreenLayout';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { DEFAULT_COMPANY_LOGO, DEFAULT_USER_AVATAR, getCompanyLogoUrl } from '../constants/images';
import { resolveAvatarUrl } from '../utils/storagePaths';
import {
  SEARCH_ENTITY_TYPE_LABELS,
  groupSearchResults,
} from '../utils/globalSearch';

function resolveAvatarSrc(item) {
  if (!item.avatar_path) {
    return item.type === 'candidate' ? DEFAULT_USER_AVATAR : DEFAULT_COMPANY_LOGO;
  }

  if (item.type === 'candidate') {
    return resolveAvatarUrl(item.avatar_path) || DEFAULT_USER_AVATAR;
  }

  return getCompanyLogoUrl(item.avatar_path);
}

function SearchResultItem({ item }) {
  const avatarFallback = item.type === 'candidate' ? DEFAULT_USER_AVATAR : DEFAULT_COMPANY_LOGO;

  return (
    <Link to={item.path} className="flex gap-3 border-b border-gray-100 p-4 hover:bg-gray-50">
      <Avatar
        src={resolveAvatarSrc(item)}
        name={item.title}
        fallback={avatarFallback}
        size="sm"
        className={
          item.type === 'company' || item.type === 'institution' || item.type === 'job'
            ? '!rounded-xl shrink-0'
            : 'shrink-0'
        }
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
          {SEARCH_ENTITY_TYPE_LABELS[item.type] ?? 'Resultado'}
        </p>
        <p className="mt-1 truncate font-semibold text-gray-900">{item.title}</p>
        {item.subtitle && <p className="mt-1 truncate text-sm text-gray-500">{item.subtitle}</p>}
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
    if (role !== ROLES.COMPANY || !user?.id) {
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
        role === ROLES.CANDIDATE && profile
          ? { userProfile: profile }
          : role === ROLES.COMPANY && companyJobs.length
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
    if (loading) return <Spinner />;
    if (results.length === 0) {
      return <p className="p-4 text-slate-500">No se encontraron resultados.</p>;
    }

    return groupedResults.map((group) => (
      <section key={group.type} className="border-b border-gray-100 last:border-b-0">
        <h2 className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {group.label}
        </h2>
        {group.items.map((item) => (
          <SearchResultItem key={`${item.type}-${item.id}`} item={item} />
        ))}
      </section>
    ));
  };

  return (
    <MobileScreenLayout header={<h1 className="truncate text-xl font-bold">Resultados para &quot;{query}&quot;</h1>}>
      {!query ? (
        <p className="p-4 text-slate-500">Escribe algo para buscar personas, empresas o instituciones.</p>
      ) : (
        renderResults()
      )}
    </MobileScreenLayout>
  );
}
