import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { searchService } from '../services/search.service';
import MobileScreenLayout from '../components/layout/MobileScreenLayout';
import Spinner from '../components/ui/Spinner';
import { ROLES } from '../constants/roles';

function CandidateResult({ profile }) {
  return <div className="border-b p-4">Candidato: {profile.full_name}</div>;
}

function JobResult({ job }) {
  return <div className="border-b p-4">Oferta: {job.title}</div>;
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
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
      const { data, error: searchError } = await searchService.search({ query, role });

      if (searchError) {
        setError('Hubo un error al realizar la búsqueda.');
        console.error(searchError);
      } else {
        setResults(data || []);
      }
      setLoading(false);
    };

    performSearch();
  }, [query, role]);

  const renderResults = () => {
    if (loading) return <Spinner />;
    if (error) return <p className="p-4 text-red-600">{error}</p>;
    if (results.length === 0) return <p className="p-4 text-slate-500">No se encontraron resultados para "{query}".</p>;

    return results.map((item) =>
      role === ROLES.COMPANY ? <CandidateResult key={item.id} profile={item} /> : <JobResult key={item.id} job={item} />,
    );
  };

  return (
    <MobileScreenLayout header={<h1 className="truncate text-xl font-bold">Resultados para "{query}"</h1>}>
      {renderResults()}
    </MobileScreenLayout>
  );
}