import { useCallback, useMemo, useState } from 'react';
import PageContainer from '../components/layout/PageContainer';
import EmptyState from '../components/common/EmptyState';
import HelpSearch from '../components/help/HelpSearch';
import HelpCategory from '../components/help/HelpCategory';
import HelpContactCard from '../components/help/HelpContactCard';
import { useAuth } from '../hooks/useAuth';
import {
  filterHelpCategories,
  helpCategories,
  orderHelpCategories,
} from '../data/help-center';

export default function HelpCenter() {
  const { role } = useAuth();
  const [query, setQuery] = useState('');
  const [openQuestionId, setOpenQuestionId] = useState(null);

  const orderedCategories = useMemo(
    () => orderHelpCategories(helpCategories, role),
    [role],
  );

  const filteredCategories = useMemo(
    () => filterHelpCategories(orderedCategories, query),
    [orderedCategories, query],
  );

  const handleToggleQuestion = useCallback((questionId) => {
    setOpenQuestionId((current) => (current === questionId ? null : questionId));
  }, []);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    setOpenQuestionId(null);
  }, []);

  const hasResults = filteredCategories.length > 0;

  return (
    <PageContainer backButton bottomNav={false}>
      <div className="mx-auto max-w-lg bg-app-bg pb-space-3xl">
        <div className="border-b border-app-border px-space-base py-space-xl sm:px-space-lg">
          <h1 className="text-heading-m text-app-text">Centro de Ayuda</h1>
          <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">
            Encuentra respuestas rápidas a las preguntas más frecuentes sobre TrabaGE.
          </p>
          <div className="mt-space-lg">
            <HelpSearch value={query} onChange={handleQueryChange} />
          </div>
        </div>

        <div className="space-y-space-base px-space-base py-space-xl sm:px-space-lg">
          {hasResults ? (
            filteredCategories.map((category) => (
              <HelpCategory
                key={category.id}
                category={category}
                openQuestionId={openQuestionId}
                onToggleQuestion={handleToggleQuestion}
              />
            ))
          ) : (
            <EmptyState
              title="No se encontraron resultados"
              description="Prueba con otra palabra clave."
            />
          )}

          <HelpContactCard />
        </div>
      </div>
    </PageContainer>
  );
}
