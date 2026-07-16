import { isEmployerAuthor } from '../constants/authorTypes';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MobileScreenLayout from '../components/layout/MobileScreenLayout';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/common/EmptyState';
import PostCard from '../components/feed/PostCard';
import { postsService } from '../services/posts.service';
import { supabase } from '../config/supabase';
import { getCompanyLogoUrl } from '../constants/images';
import { resolveUserAvatar } from '../utils/resolveUserAvatar';

async function enrichPost(post) {
  if (!post) return post;

  if (isEmployerAuthor(post.author_type)) {
    const { data: company } = await supabase
      .from('company_profiles')
      .select('user_id, company_name, logo_path, is_verified, verification_status')
      .eq('user_id', post.author_id)
      .maybeSingle();

    return {
      ...post,
      author_name: company?.company_name ?? 'Empresa',
      author_avatar: getCompanyLogoUrl(company?.logo_path),
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
    author_name: candidate?.full_name ?? 'Usuario',
    author_headline: candidate?.headline ?? '',
    author_avatar: resolveUserAvatar(candidate?.avatar_path),
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
    <MobileScreenLayout header={<h1 className="truncate text-xl font-bold">Publicación</h1>}>
      <div className="p-4">
        {loading ? (
          <Spinner />
        ) : !post ? (
          <EmptyState
            title="Publicación no encontrada"
            description="El contenido puede haber sido eliminado o no estar disponible."
          />
        ) : (
          <PostCard
            post={post}
            authorId={post.author_id}
            authorName={post.author_name}
            authorHeadline={post.author_headline}
            authorAvatar={post.author_avatar}
            authorType={post.author_type}
            authorCompany={post.author_company}
          />
        )}
      </div>
    </MobileScreenLayout>
  );
}
