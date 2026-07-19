import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppIcon from '../components/common/AppIcon';
import DirectoryBrandDisclaimer from '../components/legal/DirectoryBrandDisclaimer';
import PageContainer from '../components/layout/PageContainer';
import { TopBarShell } from '../components/layout/TopBar';
import SearchHistorySection from '../components/search/SearchHistorySection';
import SearchResultsList from '../components/search/SearchResultsList';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { ArrowLeft, Search, X, ICON_COLORS, ICON_SIZES } from '../constants/icons';

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const { history, add, remove, clear } = useSearchHistory();
  const { results, loading, error } = useGlobalSearch(query, {
    enabled: true,
    limitPerType: 8,
    includeJobs: true,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const urlQuery = searchParams.get('q') ?? '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  const syncQueryToUrl = (nextQuery) => {
    const trimmed = nextQuery.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleQueryChange = (event) => {
    const next = event.target.value;
    setQuery(next);
    syncQueryToUrl(next);
  };

  const handleClearQuery = () => {
    setQuery('');
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    add(trimmed);
  };

  const handleHistorySelect = (term) => {
    setQuery(term);
    syncQueryToUrl(term);
    add(term);
    inputRef.current?.focus();
  };

  const handleResultSelect = () => {
    const trimmed = query.trim();
    if (trimmed) add(trimmed);
  };

  const trimmedQuery = query.trim();
  const showResults = Boolean(trimmedQuery);

  return (
    <PageContainer bottomNav={false} topBar={false} className="min-h-dvh bg-app-bg">
      <TopBarShell>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"
          aria-label="Volver"
        >
          <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
        </button>

        <form onSubmit={handleSubmit} className="relative min-w-0 flex-1">
          <AppIcon
            icon={Search}
            size={ICON_SIZES.default}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ICON_COLORS.inactive}`}
          />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Buscar usuarios, empresas y empleos"
            value={query}
            onChange={handleQueryChange}
            placeholder="Buscar usuarios, empresas y empleos…"
            className="w-full rounded-full border-0 bg-app-surface py-2 pl-9 pr-9 text-sm text-app-text outline-none transition-colors placeholder:text-app-muted focus:ring-2 focus:ring-primary-100"
          />
          {query ? (
            <button
              type="button"
              onClick={handleClearQuery}
              className="absolute right-2 top-1/2 inline-flex min-h-touch min-w-touch -translate-y-1/2 items-center justify-center rounded-radius-sm text-app-subtle transition-colors hover:text-app-muted"
              aria-label="Limpiar búsqueda"
            >
              <AppIcon icon={X} size={ICON_SIZES.sm} />
            </button>
          ) : null}
        </form>
      </TopBarShell>

      <main className="search-screen-enter min-h-[calc(100dvh-var(--topbar-height,3.5rem))] bg-app-bg">
        {showResults ? (
          <>
            <SearchResultsList
              query={query}
              results={results}
              loading={loading}
              error={error}
              onSelect={handleResultSelect}
            />
            {!loading && results.length > 0 ? <DirectoryBrandDisclaimer /> : null}
          </>
        ) : (
          <SearchHistorySection
            history={history}
            onSelect={handleHistorySelect}
            onRemove={remove}
            onClear={clear}
          />
        )}
      </main>
    </PageContainer>
  );
}
