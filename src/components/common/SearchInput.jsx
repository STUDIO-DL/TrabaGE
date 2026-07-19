import SearchBarTrigger from '../search/SearchBarTrigger';

export default function SearchInput({ placeholder = 'Buscar usuarios y empresas…' }) {
  return (
    <SearchBarTrigger
      placeholder={placeholder}
      className="w-full"
    />
  );
}
