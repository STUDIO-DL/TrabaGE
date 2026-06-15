import { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import CompanyFeedHeader from '../../components/feed/CompanyFeedHeader';
import EmptyState from '../../components/common/EmptyState';
import { NoPosts } from '../../assets/empty-states';

export default function Feed() {
  const [query, setQuery] = useState('');

  return (
    <PageContainer
      topBar={<CompanyFeedHeader query={query} onQueryChange={setQuery} />}
    >
      <EmptyState
        image={NoPosts}
        title="No hay publicaciones"
        description="Las publicaciones aparecerán aquí cuando empresas y usuarios compartan contenido."
      />
    </PageContainer>
  );
}
