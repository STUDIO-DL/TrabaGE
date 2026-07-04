import { useCallback, useEffect, useRef, useState } from 'react';
import { postsService } from '../services/posts.service';
import { supabase } from '../config/supabase';
import { useAuth } from './useAuth';
import { ROLES } from '../constants/roles';
import { getPreviewPosts } from '../constants/preview';
import { getCompanyLogoUrl } from '../constants/images';
import { resolveUserAvatar } from '../utils/resolveUserAvatar';
import { extractUserKeywords } from '../utils/calculateJobMatch';

const PAGE_SIZE = 30;

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
      author_path: isCandidateOwner ? '/candidate/profile' : `/profile/${post.author_id}`,
    };
  });
}

function tokenize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9áéíóúñ]+/i)
    .filter((token) => token.length > 2);
}

function recencyScore(createdAt) {
  const ageMs = Date.now() - new Date(createdAt ?? 0).getTime();
  const ageDays = Math.max(0, ageMs / 86400000);
  if (ageDays <= 1) return 20;
  if (ageDays <= 7) return 14;
  if (ageDays <= 30) return 8;
  return 2;
}

function rankPostsForCandidate(posts, profile, followedCompanyIds) {
  if (!profile) return posts;

  const userKeywords = new Set(extractUserKeywords(profile));
  return [...posts]
    .map((post) => {
      const postTokens = tokenize([
        post.content,
        post.author_name,
        post.author_headline,
        post.author_company?.sector,
      ].filter(Boolean).join(' '));
      const keywordMatches = postTokens.filter((token) => userKeywords.has(token)).length;
      const followedBoost =
        post.author_type === 'company' && followedCompanyIds.includes(post.author_id) ? 40 : 0;
      const companyBoost = post.author_type === 'company' ? 10 : 0;
      const relevance = Math.min(30, keywordMatches * 6);

      return {
        post,
        score: followedBoost + companyBoost + relevance + recencyScore(post.created_at),
      };
    })
    .sort((a, b) => b.score - a.score || new Date(b.post.created_at) - new Date(a.post.created_at))
    .map(({ post }) => post);
}

async function rankPosts(posts, user, role, authorId) {
  if (authorId || role !== ROLES.CANDIDATE || !user?.id) return posts;

  const [profileResult, followsResult] = await Promise.all([
    supabase
      .from('candidate_profiles')
      .select('user_id, headline, about, job_preferences, skills(name), experience(position), education(institution, program, grade), languages(language, level)')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('follows')
      .select('target_id')
      .eq('user_id', user.id)
      .eq('target_type', 'company'),
  ]);

  if (profileResult.error) return posts;
  return rankPostsForCandidate(
    posts,
    profileResult.data,
    (followsResult.data ?? []).map((follow) => follow.target_id),
  );
}

export function usePosts(authorId) {
  const { user, isPreviewMode, role } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const postsRef = useRef([]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const fetchPosts = useCallback(async ({ append = false, offset = 0 } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
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
      setHasMore(false);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const { data, error: fetchError } = authorId
      ? await postsService.getByAuthor(authorId, { limit: PAGE_SIZE, offset })
      : await postsService.getFeed({ limit: PAGE_SIZE, offset });

    if (fetchError) {
      if (!append) setPosts([]);
      setError(fetchError.message);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const enriched = await enrichPosts(data ?? [], { ...user, role });
    const nextPosts = append
      ? [...postsRef.current, ...enriched].filter(
          (post, index, list) => list.findIndex((item) => item.id === post.id) === index,
        )
      : enriched;
    const ranked = await rankPosts(nextPosts, user, role, authorId);
    setPosts(ranked);
    setHasMore((data ?? []).length === PAGE_SIZE);
    setError(null);
    setLoading(false);
    setLoadingMore(false);
  }, [authorId, isPreviewMode, role, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchPosts({ append: true, offset: posts.length });
  }, [fetchPosts, hasMore, loading, loadingMore, posts.length]);

  return { posts, loading, loadingMore, hasMore, error, refetch: fetchPosts, loadMore };
}
