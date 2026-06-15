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
      <div className="mx-auto max-w-3xl bg-white pb-10">
        <div className="border-b border-slate-200 px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Centro de Ayuda</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Encuentra respuestas rápidas a las preguntas más frecuentes sobre TrabaGE.
          </p>
          <div className="mt-5">
            <HelpSearch value={query} onChange={handleQueryChange} />
          </div>
        </div>

        <div className="space-y-4 px-4 py-6 sm:px-6">
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
