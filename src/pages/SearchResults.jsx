import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { searchService } from '../services/search.service';
import { reportError } from '../utils/logger';
import MobileScreenLayout from '../components/layout/MobileScreenLayout';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { DEFAULT_COMPANY_LOGO, DEFAULT_USER_AVATAR } from '../constants/images';

const TYPE_LABELS = {
  job: 'Oferta',
  candidate: 'Candidato',
  company: 'Empresa',
  post: 'Publicación',
};

function SearchResultItem({ item }) {
  const fallback = item.type === 'company' || item.type === 'job'
    ? DEFAULT_COMPANY_LOGO
    : DEFAULT_USER_AVATAR;

  return (
    <Link to={item.path} className="flex gap-3 border-b border-gray-100 p-4 hover:bg-gray-50">
      <Avatar
        src={item.avatar_path}
        name={item.title}
        fallback={fallback}
        size="sm"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
          {TYPE_LABELS[item.type] ?? 'Resultado'}
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
  const query = searchParams.get('q');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query || !role) {
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError('');
      const { data, error: searchError } = await searchService.search({
        query,
        user: user ? { id: user.id, role } : null,
      });

      if (searchError) {
        setError('Hubo un error al realizar la búsqueda.');
        reportError(searchError, { area: 'search_results', query });
      } else {
        setResults(data || []);
      }
      setLoading(false);
    };

    performSearch();
  }, [query, role, user]);

  const renderResults = () => {
    if (loading) return <Spinner />;
    if (error) return <p className="p-4 text-red-600">{error}</p>;
    if (results.length === 0) return <p className="p-4 text-slate-500">No se encontraron resultados para "{query}".</p>;

    return results.map((item) => <SearchResultItem key={`${item.type}-${item.id}`} item={item} />);
  };

  return (
    <MobileScreenLayout header={<h1 className="truncate text-xl font-bold">Resultados para "{query}"</h1>}>
      {renderResults()}
    </MobileScreenLayout>
  );
}