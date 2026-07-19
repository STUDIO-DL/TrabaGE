import SearchBarTrigger from '../search/SearchBarTrigger';

export default function SearchInput({ placeholder = 'Buscar usuarios, empresas y empleos…' }) {
  return (
    <SearchBarTrigger
      placeholder={placeholder}
      className="w-full"
      variant="pill"
    />
  );
}
