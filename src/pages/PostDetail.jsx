import { isEmployerAuthor } from '../constants/authorTypes';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import EmptyState from '../components/common/EmptyState';
import PostCard from '../components/feed/PostCard';
import { PostCardSkeleton } from '../components/common/Skeleton';
import { postsService } from '../services/posts.service';
import { supabase } from '../config/supabase';
import { resolveAuthorAvatar } from '../constants/avatarDefaults';
import { resolvePostAuthorName } from '../utils/displayIdentity';
import { ROLES } from '../constants/roles';

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
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    postsService.getById(postId).then(async ({ data }) => {
      const enriched = await enrichPost(data);
      if (!mounted) return;
      setPost(enriched ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [postId]);

  return (
    <PageContainer backButton bottomNav={false}>
      <div className="p-space-base">
        {loading ? (
          <PostCardSkeleton />
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
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
