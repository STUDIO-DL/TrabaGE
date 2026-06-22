import { useCallback, useEffect, useState } from 'react';
import { postsService } from '../services/posts.service';
import { supabase } from '../config/supabase';
import { useAuth } from './useAuth';
import { ROLES } from '../constants/roles';
import { getPreviewPosts } from '../constants/preview';
import { getCompanyLogoUrl } from '../constants/images';
import { resolveUserAvatar } from '../utils/resolveUserAvatar';

async function enrichPosts(posts, user) {
  if (!posts?.length) return posts;

  const companyIds = [
    ...new Set(posts.filter((post) => post.author_type === 'company').map((post) => post.author_id)),
  ];
  const candidateIds = [
    ...new Set(
      posts.filter((post) => post.author_type === 'candidate').map((post) => post.author_id),
    ),
  ];

  const [companiesResult, candidatesResult] = await Promise.all([
    companyIds.length
      ? supabase
          .from('company_profiles')
          .select('user_id, company_name, logo_path, is_verified, verification_status')
          .in('user_id', companyIds)
      : Promise.resolve({ data: [] }),
    candidateIds.length
      ? supabase
          .from('candidate_profiles')
          .select('user_id, full_name, headline, avatar_path')
          .in('user_id', candidateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const companies = new Map((companiesResult.data ?? []).map((row) => [row.user_id, row]));
  const candidates = new Map((candidatesResult.data ?? []).map((row) => [row.user_id, row]));

  return posts.map((post) => {
    const isOwner = user?.id === post.author_id;

    if (post.author_type === 'company') {
      const company = companies.get(post.author_id);
      const isCompanyOwner = isOwner && user?.role === ROLES.COMPANY;
      return {
        ...post,
        author_name: company?.company_name ?? post.author_name,
        author_avatar: getCompanyLogoUrl(company?.logo_path) ?? post.author_avatar,
        author_company: company ?? null,
        author_path: isCompanyOwner ? '/company/profile' : `/companies/${post.author_id}`,
      };
    }

    const candidate = candidates.get(post.author_id);
    const isCandidateOwner = isOwner && user?.role === ROLES.CANDIDATE;
    return {
      ...post,
      author_name: candidate?.full_name ?? post.author_name,
      author_headline: candidate?.headline ?? post.author_headline,
      author_avatar: resolveUserAvatar(candidate?.avatar_path) ?? post.author_avatar,
      author_path: isCandidateOwner ? '/candidate/profile' : `/profiles/${post.author_id}`,
    };
  });
}

export function usePosts(authorId) {
  const { user, isPreviewMode, role } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isPreviewMode) {
      const previewPosts = getPreviewPosts(authorId, role).map((post) =>
        post.author_type === 'company'
          ? {
              ...post,
              author_name: post.author_name ?? 'Empresa demo',
              author_company: { is_verified: false, verification_status: 'not_submitted' },
            }
          : post,
      );
      setPosts(previewPosts);
      setError(null);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = authorId
      ? await postsService.getByAuthor(authorId)
      : await postsService.getFeed();

    if (fetchError) {
      setPosts([]);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const enriched = await enrichPosts(data ?? [], user);
    setPosts(enriched);
    setError(null);
    setLoading(false);
  }, [authorId, isPreviewMode, role, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, error, refetch: fetchPosts };
}
