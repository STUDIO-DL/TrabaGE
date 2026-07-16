import { isPersonalAuthor, isEmployerAuthor } from '../constants/authorTypes';
import { supabase } from '../config/supabase';
import { ROLES, isEmployerRole } from '../constants/roles';
import {
  FEED_CONTENT_TYPES,
  FEED_PAGE_SIZE,
  FEED_RECOMMENDATION_SUBTYPES,
  INSTITUTION_COMPANY_TYPES,
} from '../constants/feedContentTypes';
import { getCompanyLogoUrl } from '../constants/images';
import { resolveUserAvatar } from '../utils/resolveUserAvatar';
import { companyService } from './company.service';
import { jobsService } from './jobs.service';
import { followsService, FOLLOWS_TARGET } from './follows.service';
import { profileService } from './profile.service';
import { dedupeFeedItems } from '../utils/feedRanking';

// The Home (Inicio) feed is purely social/informational. Job offers live
// exclusively in the Empleos section, so we strip any job items that a data
// source might return before they reach the feed.
function excludeJobItems(items) {
  return (items ?? []).filter((item) => item?.content_type !== FEED_CONTENT_TYPES.JOB);
}

async function fetchFeedPool(userId, role, { limit = FEED_PAGE_SIZE, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc('get_personalized_feed', {
    p_user_id: userId,
    p_role: role,
    p_limit: limit,
    p_offset: offset,
  });

  if (!error) return { data: excludeJobItems(data), error: null };

  return fetchFeedPoolFallback(userId, role, { limit, offset });
}

async function fetchFeedPoolFallback(userId, role, { limit, offset }) {
  const poolSize = limit * 2;
  const queries = [
    supabase
      .from('posts')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + poolSize - 1),
  ];

  // Home feed only mixes social posts and informational news — never jobs.
  if (role === ROLES.PERSONAL || isEmployerRole(role)) {
    queries.push(
      supabase
        .from('news_articles')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .range(Math.floor(offset / 2), Math.floor(offset / 2) + Math.floor(poolSize / 2) - 1),
    );
  }

  const results = await Promise.all(queries);
  const postsResult = results[0];
  if (postsResult.error) return { data: [], error: postsResult.error };

  const items = (postsResult.data ?? []).map((post) => ({
    item_key: `post:${post.id}`,
    content_type: post.content_type === 'advice' || post.content_type === 'career_tip' ? 'advice' : 'post',
    relevance_score: 12,
    sort_at: post.created_at,
    payload: post,
  }));

  const newsResult = results[1];
  if (newsResult?.data?.length) {
    const newsScore = role === ROLES.PERSONAL ? 15 : 14;
    newsResult.data.forEach((article) => {
      items.push({
        item_key: `news:${article.id}`,
        content_type: FEED_CONTENT_TYPES.NEWS,
        relevance_score: newsScore,
        sort_at: article.published_at,
        payload: article,
      });
    });
  }

  return { data: items, error: null };
}

async function enrichPosts(posts, user) {
  if (!posts?.length) return new Map();

  const companyIds = [...new Set(posts.filter((p) => isEmployerAuthor(p.author_type)).map((p) => p.author_id))];
  const candidateIds = [...new Set(posts.filter((p) => isPersonalAuthor(p.author_type)).map((p) => p.author_id))];

  const [companiesResult, candidatesResult] = await Promise.all([
    companyIds.length
      ? supabase
          .from('company_profiles')
          .select('user_id, company_name, logo_path, is_verified, verification_status, sector, company_type')
          .in('user_id', companyIds)
      : Promise.resolve({ data: [] }),
    candidateIds.length
      ? supabase
          .from('candidate_profiles_public')
          .select('user_id, full_name, headline, avatar_path')
          .in('user_id', candidateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const enriched = new Map();
  const companies = new Map((companiesResult.data ?? []).map((row) => [row.user_id, row]));
  const candidates = new Map((candidatesResult.data ?? []).map((row) => [row.user_id, row]));

  posts.forEach((post) => {
    const isOwner = user?.id === post.author_id;
    if (isEmployerAuthor(post.author_type)) {
      const company = companies.get(post.author_id);
      enriched.set(post.id, {
        ...post,
        author_name: company?.company_name ?? post.author_name,
        author_avatar: getCompanyLogoUrl(company?.logo_path) ?? post.author_avatar,
        author_company: company ?? null,
        author_path: isOwner && isEmployerRole(user?.role) ? '/business/profile' : `/companies/${post.author_id}`,
      });
      return;
    }

    const candidate = candidates.get(post.author_id);
    enriched.set(post.id, {
      ...post,
      author_name: candidate?.full_name ?? post.author_name,
      author_headline: candidate?.headline ?? post.author_headline,
      author_avatar: resolveUserAvatar(candidate?.avatar_path) ?? post.author_avatar,
      author_path: isOwner && user?.role === ROLES.PERSONAL ? '/personal/profile' : `/profile/${post.author_id}`,
    });
  });

  return enriched;
}

async function enrichRecommendationCards(items) {
  const candidateIds = items
    .filter((item) => item.payload?.subtype === FEED_RECOMMENDATION_SUBTYPES.CANDIDATE)
    .map((item) => item.payload.candidate_id);

  const companyIds = items
    .filter((item) => item.payload?.subtype === FEED_RECOMMENDATION_SUBTYPES.COMPANY)
    .map((item) => item.payload.company_id);

  const institutionIds = items
    .filter((item) => item.payload?.subtype === FEED_RECOMMENDATION_SUBTYPES.INSTITUTION)
    .map((item) => item.payload.institution_id);

  const [candidatesResult, companiesResult, institutionsResult] = await Promise.all([
    candidateIds.length
      ? supabase
          .from('candidate_profiles_public')
          .select('user_id, full_name, headline, avatar_path, city')
          .in('user_id', candidateIds)
      : Promise.resolve({ data: [] }),
    companyIds.length
      ? supabase
          .from('company_profiles')
          .select('user_id, company_name, logo_path, sector, city, is_verified, verification_status')
          .in('user_id', companyIds)
      : Promise.resolve({ data: [] }),
    institutionIds.length
      ? supabase
          .from('company_profiles')
          .select('user_id, company_name, logo_path, sector, city, company_type')
          .in('user_id', institutionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const candidateMap = new Map((candidatesResult.data ?? []).map((row) => [row.user_id, row]));
  const companyMap = new Map((companiesResult.data ?? []).map((row) => [row.user_id, row]));
  const institutionMap = new Map((institutionsResult.data ?? []).map((row) => [row.user_id, row]));

  return items.map((item) => {
    const { subtype } = item.payload;
    if (subtype === FEED_RECOMMENDATION_SUBTYPES.CANDIDATE) {
      const profile = candidateMap.get(item.payload.candidate_id);
      return {
        ...item,
        payload: { ...item.payload, candidate_profile: profile, profile },
      };
    }
    if (subtype === FEED_RECOMMENDATION_SUBTYPES.COMPANY) {
      return { ...item, payload: { ...item.payload, company: companyMap.get(item.payload.company_id) } };
    }
    if (subtype === FEED_RECOMMENDATION_SUBTYPES.INSTITUTION) {
      return {
        ...item,
        payload: { ...item.payload, institution: institutionMap.get(item.payload.institution_id) },
      };
    }
    return item;
  });
}

async function buildCandidateRecommendationCards(profile, { limit = 3 } = {}) {
  if (!profile) return [];

  const { data: companies } = await companyService.getRecommendedCompanies(profile, { limit });
  const institutionResult = await supabase
    .from('company_profiles')
    .select('user_id, company_name, logo_path, sector, city, company_type')
    .eq('is_active', true)
    .in('company_type', INSTITUTION_COMPANY_TYPES)
    .limit(5);

  const cards = [];

  (companies ?? []).slice(0, limit).forEach((company) => {
    cards.push({
      item_key: `recommend-company:${company.user_id}`,
      content_type: FEED_CONTENT_TYPES.RECOMMENDATION_CARD,
      relevance_score: company.recommendation_score ?? 10,
      sort_at: company.created_at ?? new Date().toISOString(),
      payload: {
        subtype: FEED_RECOMMENDATION_SUBTYPES.COMPANY,
        company_id: company.user_id,
        company,
        recommendation_score: company.recommendation_score,
      },
    });
  });

  (institutionResult.data ?? []).slice(0, 2).forEach((institution) => {
    cards.push({
      item_key: `recommend-institution:${institution.user_id}`,
      content_type: FEED_CONTENT_TYPES.RECOMMENDATION_CARD,
      relevance_score: 12,
      sort_at: institution.created_at ?? new Date().toISOString(),
      payload: {
        subtype: FEED_RECOMMENDATION_SUBTYPES.INSTITUTION,
        institution_id: institution.user_id,
        institution,
      },
    });
  });

  return cards;
}

async function buildFeedContext(userId, role) {
  if (!userId) return { profile: null, followedCompanyIds: [], followedInstitutionIds: [], companyJobs: [], institutionMode: false };

  if (role === ROLES.PERSONAL) {
    const [profileResult, followsCompanies, followsInstitutions] = await Promise.all([
      profileService.getCandidateFullProfile(userId),
      followsService.getFollowing(userId, FOLLOWS_TARGET.BUSINESS),
      followsService.getFollowing(userId, FOLLOWS_TARGET.ORGANIZATION),
    ]);

    const prefs = profileResult.data?.job_preferences;
    return {
      profile: profileResult.data,
      followedCompanyIds: (followsCompanies.data ?? []).map((row) => row.target_id),
      followedInstitutionIds: (followsInstitutions.data ?? []).map((row) => row.target_id),
      companyJobs: [],
      institutionMode: false,
      preferredCategories: [
        ...(prefs?.preferred_sectors?.length ? ['employment', 'labor'] : []),
        'tech',
        'business',
      ],
    };
  }

  const [companyResult, jobsResult] = await Promise.all([
    companyService.getCompanyProfile(userId),
    jobsService.getCompanyJobs(userId),
  ]);

  const companyType = companyResult.data?.company_type;
  return {
    profile: null,
    followedCompanyIds: [],
    followedInstitutionIds: [],
    companyJobs: (jobsResult.data ?? []).filter((job) => job.status === 'active'),
    institutionMode: INSTITUTION_COMPANY_TYPES.includes(companyType),
    preferredCategories: INSTITUTION_COMPANY_TYPES.includes(companyType)
      ? ['education', 'employment']
      : ['employment', 'labor', 'business'],
  };
}

export const feedService = {
  getPersonalizedFeed: fetchFeedPool,

  enrichFeedItems: async (items, user, role) => {
    if (!items?.length) return [];

    const postPayloads = items
      .filter((item) => item.content_type === FEED_CONTENT_TYPES.POST || item.content_type === FEED_CONTENT_TYPES.ADVICE)
      .map((item) => item.payload);

    const recommendationItems = items.filter(
      (item) => item.content_type === FEED_CONTENT_TYPES.RECOMMENDATION_CARD,
    );

    const [enrichedPosts, enrichedRecommendations] = await Promise.all([
      enrichPosts(postPayloads, { ...user, role }),
      enrichRecommendationCards(recommendationItems),
    ]);

    const recMap = new Map(enrichedRecommendations.map((item) => [item.item_key, item]));

    return items.map((item) => {
      if (item.content_type === FEED_CONTENT_TYPES.POST || item.content_type === FEED_CONTENT_TYPES.ADVICE) {
        const postId = item.payload?.id;
        return { ...item, payload: enrichedPosts.get(postId) ?? item.payload };
      }
      if (item.content_type === FEED_CONTENT_TYPES.RECOMMENDATION_CARD) {
        return recMap.get(item.item_key) ?? item;
      }
      return item;
    });
  },

  buildCandidateRecommendationCards,
  buildFeedContext,
  dedupeFeedItems,
};
