import { isEmployerAuthor } from '../constants/authorTypes';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import EmptyState from '../components/common/EmptyState';
import FetchErrorBanner from '../components/common/FetchErrorBanner';
import PostCard from '../components/feed/PostCard';
import { PostCardSkeleton } from '../components/common/Skeleton';
import { postsService } from '../services/posts.service';
import { supabase } from '../config/supabase';
import { resolveAuthorAvatar } from '../constants/avatarDefaults';
import { resolvePostAuthorName } from '../utils/displayIdentity';
import { ROLES } from '../constants/roles';
import { useAuth } from '../hooks/useAuth';
import { usePostMutations } from '../hooks/usePostMutations';

async function enrichPost(post) {
  if (!post) return post;

  if (isEmployerAuthor(post.author_type)) {
    const { data: company } = await supabase
      .from('company_profiles')
      .select('user_id, company_name, logo_path, is_verified, verification_status, company_type')
      .eq('user_id', post.author_id)
      .maybeSingle();

    return {
      ...post,
      author_name: resolvePostAuthorName(post, company, ROLES.BUSINESS),
      author_avatar: resolveAuthorAvatar(post.author_type, {
        logoPath: company?.logo_path,
        companyType: company?.company_type,
        profile: company,
      }),
      author_company: company,
    };
  }

  const { data: candidate } = await supabase
    .from('candidate_profiles_public')
    .select('user_id, full_name, headline, avatar_path')
    .eq('user_id', post.author_id)
    .maybeSingle();

  return {
    ...post,
    author_name: resolvePostAuthorName(post, candidate, ROLES.PERSONAL),
    author_headline: candidate?.headline ?? '',
    author_avatar: resolveAuthorAvatar(post.author_type, {
      avatarPath: candidate?.avatar_path,
    }),
  };
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPost = useCallback(() => {
    if (!postId) return;
    setLoading(true);
    setError(null);

    postsService.getById(postId).then(async ({ data, error: fetchError }) => {
      if (fetchError) {
        setPost(null);
        setError(fetchError.message ?? 'No se pudo cargar la publicación.');
        setLoading(false);
        return;
      }

      const enriched = await enrichPost(data);
      setPost(enriched ?? null);
      setError(null);
      setLoading(false);
    });
  }, [postId]);

  const { handleEdit, handleDelete } = usePostMutations({
    onSuccess: (deletedPost) => {
      if (deletedPost) {
        navigate(-1);
        return;
      }
      fetchPost();
    },
  });

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return (
    <PageContainer backButton bottomNav={false}>
      <div className="p-space-base">
        {loading ? (
          <PostCardSkeleton />
        ) : error ? (
          <FetchErrorBanner
            message="No se pudo cargar la publicación. Inténtalo de nuevo."
            onRetry={fetchPost}
          />
        ) : !post ? (
          <EmptyState
            title="Publicación no encontrada"
            description="El contenido puede haber sido eliminado o no estar disponible."
          />
        ) : (
          <div className="card-enter">
            <PostCard
              post={post}
              authorId={post.author_id}
              authorName={post.author_name}
              authorHeadline={post.author_headline}
              authorAvatar={post.author_avatar}
              authorType={post.author_type}
              authorCompany={post.author_company}
              canManage={post.author_id === user?.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
              defaultTextExpanded
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
