import PageContainer from '../../components/layout/PageContainer';
import PostComposer from '../../components/feed/PostComposer';

export default function Publish() {
  return (
    <PageContainer title="Publicar">
      <div className="p-4">
        <PostComposer onSubmit={async () => {}} />
      </div>
    </PageContainer>
  );
}
