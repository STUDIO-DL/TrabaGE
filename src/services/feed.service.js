import { isPersonalAuthor, isEmployerAuthor } from '../constants/authorTypes';
import { supabase } from '../config/supabase';
import { ROLES, isEmployerRole, rolePath } from '../constants/roles';
import {
  FEED_CONTENT_TYPES,
  FEED_PAGE_SIZE,
  FEED_RECOMMENDATION_SUBTYPES,
  INSTITUTION_COMPANY_TYPES,
  isHomeFeedPostItem,
} from '../constants/feedContentTypes';
import { resolveAuthorAvatar } from '../constants/avatarDefaults';
import { companyService } from './company.service';
import { jobsService } from './jobs.service';
import { applicationsService } from './applications.service';
import { followsService, FOLLOWS_TARGET } from './follows.service';
import { profileService } from './profile.service';
import { topicsService } from './topics.service';
import { dedupeFeedItems } from '../utils/feedRanking';
import { resolvePostAuthorName } from '../utils/displayIdentity';
import { normalizePostsTopics } from '../utils/normalizePostTopics';

// The Home (Inicio) feed shows posts only. Job offers live exclusively in
// Empleos; news, events, courses, and recommendation cards are excluded here.
function filterPostOnlyItems(items) {
  return (items ?? []).filter(isHomeFeedPostItem);
}

async function fetchFeedPool(userId, role, { limit = FEED_PAGE_SIZE, offset = 0 } = {}) {
  const rpcRole = isEmployerRole(role) ? 'company' : role;
  const { data, error } = await supabase.rpc('get_personalized_feed', {
    p_user_id: userId,
    p_role: rpcRole,
    p_limit: limit,
    p_offset: offset,
  });

  if (!error) return { data: filterPostOnlyItems(data), error: null };

  return fetchFeedPoolFallback(userId, role, { limit, offset });
}

async function fetchFeedPoolFallback(_userId, _role, { limit, offset }) {
  const poolSize = limit * 2;
  const postsResult = await supabase
    .from('posts')
    .select(`*, ${topicsService.POST_TOPICS_EMBED}`)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + poolSize - 1);

  if (postsResult.error) return { data: [], error: postsResult.error };

  const posts = normalizePostsTopics(postsResult.data ?? []);

  const items = posts.map((post) => ({
    item_key: `post:${post.id}`,
    content_type:
      post.content_type === 'advice' ||
      post.content_type === 'career_tip' ||
      post.content_type === 'hiring_trend'
        ? 'advice'
        : 'post',
    relevance_score: 12,
    sort_at: post.created_at,
    payload: post,
  }));

  return { data: items, error: null };
}

async function enrichPosts(posts, user) {
  if (!posts?.length) return new Map();

  const companyIds = [...new Set(posts.filter((p) => isEmployerAuthor(p.author_type)).map((p) => p.author_id))];
  const candidateIds = [...new Set(posts.filter((p) => isPersonalAuthor(p.author_type)).map((p) => p.author_id))];

  const [companiesResult, candidatesResult, postsWithTopics] = await Promise.all([
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
    topicsService.attachTopicsToPosts(posts),
  ]);

  const enriched = new Map();
  const companies = new Map((companiesResult.data ?? []).map((row) => [row.user_id, row]));
  const candidates = new Map((candidatesResult.data ?? []).map((row) => [row.user_id, row]));

  postsWithTopics.forEach((post) => {
    const isOwner = user?.id === post.author_id;
    if (isEmployerAuthor(post.author_type)) {
      const company = companies.get(post.author_id);
      enriched.set(post.id, {
        ...post,
        author_name: resolvePostAuthorName(post, company, ROLES.BUSINESS),
        author_avatar: resolveAuthorAvatar(post.author_type, {
          logoPath: company?.logo_path,
          companyType: company?.company_type,
          profile: company,
        }) ?? post.author_avatar,
        author_company: company ?? null,
        author_path: isOwner && isEmployerRole(user?.role) ? rolePath(user.role, '/profile') : `/companies/${post.author_id}`,
      });
      return;
    }

    const candidate = candidates.get(post.author_id);
    enriched.set(post.id, {
      ...post,
      author_name: resolvePostAuthorName(post, candidate, ROLES.PERSONAL),
      author_headline: candidate?.headline ?? post.author_headline,
      author_avatar: resolveAuthorAvatar(post.author_type, {
        avatarPath: candidate?.avatar_path,
      }) ?? post.author_avatar,
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
  if (!userId) {
    return {
      profile: null,
      companyProfile: null,
      followedCompanyIds: [],
      followedInstitutionIds: [],
      companyJobs: [],
      institutionMode: false,
      recentActivityKeywords: [],
    };
  }

  if (role === ROLES.PERSONAL) {
    const [profileResult, followsCompanies, followsInstitutions, savedJobsResult, applicationsResult] =
      await Promise.all([
        profileService.getCandidateFullProfile(userId),
        followsService.getFollowing(userId, FOLLOWS_TARGET.BUSINESS),
        followsService.getFollowing(userId, FOLLOWS_TARGET.ORGANIZATION),
        jobsService.getSavedJobs(userId),
        applicationsService.getCandidateApplications(userId),
      ]);

    const prefs = profileResult.data?.job_preferences;
    const recentActivityKeywords = [
      ...(savedJobsResult.data ?? []).flatMap((row) => [
        row.jobs?.title,
        row.jobs?.sector,
        row.jobs?.company_profiles?.sector,
      ]),
      ...(applicationsResult.data ?? []).flatMap((row) => [
        row.jobs?.title,
        row.jobs?.sector,
        row.jobs?.company_profiles?.sector,
      ]),
    ]
      .filter(Boolean)
      .flatMap((value) => String(value).toLowerCase().split(/\s+/))
      .filter((token) => token.length > 2);

    return {
      profile: profileResult.data,
      companyProfile: null,
      followedCompanyIds: (followsCompanies.data ?? []).map((row) => row.target_id),
      followedInstitutionIds: (followsInstitutions.data ?? []).map((row) => row.target_id),
      companyJobs: [],
      institutionMode: false,
      recentActivityKeywords: [...new Set(recentActivityKeywords)],
      preferredCategories: [
        ...(prefs?.preferred_sectors?.length ? ['employment', 'labor'] : []),
        ...(prefs?.preferred_categories ?? []),
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
    companyProfile: companyResult.data,
    followedCompanyIds: [],
    followedInstitutionIds: [],
    companyJobs: (jobsResult.data ?? []).filter((job) => job.status === 'active'),
    institutionMode: INSTITUTION_COMPANY_TYPES.includes(companyType),
    recentActivityKeywords: [],
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
