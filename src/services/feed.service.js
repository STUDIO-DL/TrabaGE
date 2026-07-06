import { supabase } from '../config/supabase';
import { ROLES } from '../constants/roles';
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

const JOB_SELECT =
  '*, company_profiles(company_name, logo_path, is_verified, verification_status, sector, city)';

async function fetchFeedPool(userId, role, { limit = FEED_PAGE_SIZE, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc('get_personalized_feed', {
    p_user_id: userId,
    p_role: role,
    p_limit: limit,
    p_offset: offset,
  });

  if (!error) return { data: data ?? [], error: null };

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

  if (role === ROLES.CANDIDATE && userId) {
    queries.push(
      supabase.rpc('get_ranked_jobs_for_candidate', {
        p_user_id: userId,
        p_limit: poolSize,
        p_min_score: 1,
      }),
    );
    queries.push(
      supabase
        .from('news_articles')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .range(Math.floor(offset / 2), Math.floor(offset / 2) + Math.floor(poolSize / 2) - 1),
    );
  } else if (role === ROLES.COMPANY) {
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

  if (role === ROLES.CANDIDATE && results[1]?.data?.length) {
    const jobIds = results[1].data.map((row) => row.job_id);
    const { data: jobs } = await supabase.from('jobs').select(JOB_SELECT).in('id', jobIds);
    const jobMap = new Map((jobs ?? []).map((job) => [job.id, job]));

    results[1].data.forEach((row) => {
      const job = jobMap.get(row.job_id);
      if (!job) return;
      items.push({
        item_key: `job:${job.id}`,
        content_type: FEED_CONTENT_TYPES.JOB,
        relevance_score: row.score,
        sort_at: job.created_at,
        payload: { job, match_score: row.score, company_id: job.company_id },
      });
    });
  }

  if (role === ROLES.CANDIDATE && results[2]?.data?.length) {
    results[2].data.forEach((article) => {
      items.push({
        item_key: `news:${article.id}`,
        content_type: FEED_CONTENT_TYPES.NEWS,
        relevance_score: 15,
        sort_at: article.published_at,
        payload: article,
      });
    });
  }

  const newsResultIndex = role === ROLES.CANDIDATE ? 2 : 1;
  if (role === ROLES.COMPANY && results[newsResultIndex]?.data?.length) {
    results[newsResultIndex].data.forEach((article) => {
      items.push({
        item_key: `news:${article.id}`,
        content_type: FEED_CONTENT_TYPES.NEWS,
        relevance_score: 14,
        sort_at: article.published_at,
        payload: article,
      });
    });
  }

  return { data: items, error: null };
}

async function enrichPosts(posts, user) {
  if (!posts?.length) return new Map();

  const companyIds = [...new Set(posts.filter((p) => p.author_type === 'company').map((p) => p.author_id))];
  const candidateIds = [...new Set(posts.filter((p) => p.author_type === 'candidate').map((p) => p.author_id))];

  const [companiesResult, candidatesResult] = await Promise.all([
    companyIds.length
      ? supabase
          .from('company_profiles')
          .select('user_id, company_name, logo_path, is_verified, verification_status, sector, company_type')
          .in('user_id', companyIds)
      : Promise.resolve({ data: [] }),
    candidateIds.length
      ? supabase
          .from('candidate_profiles')
          .select('user_id, full_name, headline, avatar_path')
          .in('user_id', candidateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const enriched = new Map();
  const companies = new Map((companiesResult.data ?? []).map((row) => [row.user_id, row]));
  const candidates = new Map((candidatesResult.data ?? []).map((row) => [row.user_id, row]));

  posts.forEach((post) => {
    const isOwner = user?.id === post.author_id;
    if (post.author_type === 'company') {
      const company = companies.get(post.author_id);
      enriched.set(post.id, {
        ...post,
        author_name: company?.company_name ?? post.author_name,
        author_avatar: getCompanyLogoUrl(company?.logo_path) ?? post.author_avatar,
        author_company: company ?? null,
        author_path: isOwner && user?.role === ROLES.COMPANY ? '/company/profile' : `/companies/${post.author_id}`,
      });
      return;
    }

    const candidate = candidates.get(post.author_id);
    enriched.set(post.id, {
      ...post,
      author_name: candidate?.full_name ?? post.author_name,
      author_headline: candidate?.headline ?? post.author_headline,
      author_avatar: resolveUserAvatar(candidate?.avatar_path) ?? post.author_avatar,
      author_path: isOwner && user?.role === ROLES.CANDIDATE ? '/candidate/profile' : `/profile/${post.author_id}`,
    });
  });

  return enriched;
}

async function enrichJobs(jobPayloads) {
  const missingIds = jobPayloads
    .filter((entry) => !entry.job?.company_profiles)
    .map((entry) => entry.job?.id ?? entry.id)
    .filter(Boolean);

  if (!missingIds.length) return jobPayloads;

  const { data: jobs } = await supabase.from('jobs').select(JOB_SELECT).in('id', missingIds);
  const jobMap = new Map((jobs ?? []).map((job) => [job.id, job]));

  return jobPayloads.map((entry) => {
    const jobId = entry.job?.id ?? entry.id;
    const job = jobMap.get(jobId) ?? entry.job ?? entry;
    return { job, match_score: entry.match_score, company_id: job.company_id };
  });
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
          .from('candidate_profiles')
          .select('user_id, full_name, headline, avatar_path, city, skills(name)')
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

  if (role === ROLES.CANDIDATE) {
    const [profileResult, followsCompanies, followsInstitutions] = await Promise.all([
      profileService.getCandidateFullProfile(userId),
      followsService.getFollowing(userId, FOLLOWS_TARGET.COMPANY),
      followsService.getFollowing(userId, FOLLOWS_TARGET.INSTITUTION),
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

    const jobPayloads = items
      .filter((item) => item.content_type === FEED_CONTENT_TYPES.JOB)
      .map((item) => item.payload);

    const recommendationItems = items.filter(
      (item) => item.content_type === FEED_CONTENT_TYPES.RECOMMENDATION_CARD,
    );

    const [enrichedPosts, enrichedJobs, enrichedRecommendations] = await Promise.all([
      enrichPosts(postPayloads, { ...user, role }),
      enrichJobs(jobPayloads),
      enrichRecommendationCards(recommendationItems),
    ]);

    const jobMap = new Map(enrichedJobs.map((entry, index) => [jobPayloads[index]?.job?.id ?? jobPayloads[index]?.id, entry]));
    const recMap = new Map(enrichedRecommendations.map((item) => [item.item_key, item]));

    return items.map((item) => {
      if (item.content_type === FEED_CONTENT_TYPES.POST || item.content_type === FEED_CONTENT_TYPES.ADVICE) {
        const postId = item.payload?.id;
        return { ...item, payload: enrichedPosts.get(postId) ?? item.payload };
      }
      if (item.content_type === FEED_CONTENT_TYPES.JOB) {
        const jobId = item.payload?.job?.id ?? item.payload?.id;
        const enriched = jobMap.get(jobId);
        return enriched ? { ...item, payload: enriched } : item;
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
