import GlobalSearch from './search/GlobalSearch';

export default function SearchInput({ placeholder = 'Buscar personas, empresas, empleos…' }) {
  return (
    <GlobalSearch
      placeholder={placeholder}
      className="w-full"
      variant="pill"
    />
  );
}
