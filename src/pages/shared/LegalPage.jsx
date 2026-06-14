import PageContainer from '../../components/layout/PageContainer';

export default function LegalPage({ title, children }) {
  return (
    <PageContainer title={title} backButton bottomNav={false}>
      <div className="prose prose-sm max-w-none p-6 text-gray-600">{children}</div>
    </PageContainer>
  );
}
