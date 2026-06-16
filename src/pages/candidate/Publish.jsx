import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import PostComposer from '../../components/feed/PostComposer';
import { useAuth } from '../../hooks/useAuth';
import { useCreatePost } from '../../hooks/useCreatePost';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

export default function Publish() {
  const { isPreviewMode } = useAuth();
  const { createPost, loading } = useCreatePost();

  return (
    <PageContainer title="Publicar">
      <div className="p-4">
        {isPreviewMode ? (
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-6 text-center">
            <p className="text-sm text-primary-900">{GUEST_MODE_MESSAGE}</p>
            <Link
              to="/login"
              className="mt-4 inline-block rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <PostComposer onSubmit={createPost} loading={loading} />
        )}
      </div>
    </PageContainer>
  );
}
