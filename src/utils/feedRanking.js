import { isEmployerAuthor } from '../constants/authorTypes';
import { calculateJobMatch, extractUserKeywords } from './calculateJobMatch';
import { getCandidateCompletenessWeight } from './profileCompleteness';
import {
  FEED_CONTENT_TYPES,
  FEED_MAX_CONSECUTIVE_SAME_TYPE,
} from '../constants/feedContentTypes';

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

function countTrailingSameType(items, contentType) {
  let count = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].content_type !== contentType) break;
    count += 1;
  }
  return count;
}

/**
 * Scores a single feed item. Internal scores only — never surfaced in UI.
 * Swappable interface: replace this function to plug AI/embeddings later.
 */
export function scoreFeedItem(item, context = {}) {
  const {
    profile,
    followedCompanyIds = [],
    followedInstitutionIds = [],
    companyJobs = [],
    preferredCategories = [],
    institutionMode = false,
  } = context;

  const sortAt = item.sort_at ?? item.payload?.created_at ?? item.payload?.published_at;
  let score = Number(item.relevance_score ?? 0) + recencyScore(sortAt);

  // Architecture hook: sponsored/promoted content weighting (no UI indicator in v1)
  const promotionWeight = Number(item.payload?.promotion_weight ?? 0);
  if (promotionWeight > 0) score += promotionWeight * 0.6;
  if (item.payload?.is_sponsored) score += 5;

  switch (item.content_type) {
    case FEED_CONTENT_TYPES.POST:
    case FEED_CONTENT_TYPES.ADVICE: {
      const post = item.payload;
      if (isEmployerAuthor(post?.author_type) && followedCompanyIds.includes(post?.author_id)) {
        score += 35;
      }
      if (profile) {
        const userKeywords = new Set([
          ...extractUserKeywords(profile),
          ...(context.recentActivityKeywords ?? []),
        ]);
        const postTokens = tokenize(
          [post?.content, post?.author_name, post?.author_headline, post?.category]
            .filter(Boolean)
            .join(' '),
        );
        const keywordMatches = postTokens.filter((token) => userKeywords.has(token)).length;
        score += Math.min(25, keywordMatches * 5);

        if (profile.sector) {
          const sectorTokens = tokenize(profile.sector);
          const sectorMatches = postTokens.filter((token) => sectorTokens.includes(token)).length;
          score += Math.min(30, sectorMatches * 10);
        }

        if (profile.city) {
          const cityToken = tokenize(profile.city)[0];
          if (cityToken && postTokens.includes(cityToken)) score += 15;
        }

        if (profile.province) {
          const provinceToken = tokenize(profile.province)[0];
          if (provinceToken && postTokens.includes(provinceToken)) score += 10;
        }
      } else if (context.companyProfile?.sector) {
        const postTokens = tokenize(
          [post?.content, post?.author_name, post?.category].filter(Boolean).join(' '),
        );
        const sectorTokens = tokenize(context.companyProfile.sector);
        const sectorMatches = postTokens.filter((token) => sectorTokens.includes(token)).length;
        score += Math.min(30, sectorMatches * 10);
      }
      if (isEmployerAuthor(post?.author_type)) score += institutionMode ? 6 : 10;
      if (item.content_type === FEED_CONTENT_TYPES.ADVICE) score += 8;
      break;
    }

    case FEED_CONTENT_TYPES.NEWS: {
      const category = item.payload?.category;
      if (preferredCategories.includes(category)) score += 18;
      if (institutionMode && category === 'education') score += 15;
      break;
    }

    case FEED_CONTENT_TYPES.EVENT:
      score += institutionMode ? 10 : 6;
      break;

    case FEED_CONTENT_TYPES.COURSE: {
      if (profile?.skills?.length) {
        const skillTokens = new Set(
          (profile.skills ?? []).flatMap((skill) => tokenize(skill?.name ?? skill)),
        );
        const courseTags = (item.payload?.skills_tags ?? []).flatMap(tokenize);
        const tagMatches = courseTags.filter((tag) => skillTokens.has(tag)).length;
        score += Math.min(20, tagMatches * 6);
      }
      break;
    }

    case FEED_CONTENT_TYPES.RECOMMENDATION_CARD: {
      const subtype = item.payload?.subtype;
      if (subtype === 'company' && followedCompanyIds.includes(item.payload?.company_id)) {
        score -= 50;
      }
      if (subtype === 'institution' && followedInstitutionIds.includes(item.payload?.institution_id)) {
        score -= 50;
      }
      if (subtype === 'candidate' && profile) {
        score += getCandidateCompletenessWeight(profile) * 10;
      }
      if (subtype === 'candidate' && companyJobs?.length) {
        const candidateProfile = item.payload?.candidate_profile;
        if (candidateProfile) {
          const bestMatch = companyJobs.reduce(
            (best, job) => Math.max(best, calculateJobMatch(candidateProfile, job)),
            0,
          );
          score += Math.min(35, bestMatch * 0.35);
        }
      }
      score += Number(item.payload?.recommendation_score ?? item.payload?.match_score ?? 0) * 0.3;
      break;
    }

    default:
      break;
  }

  return { ...item, _score: score };
}

/**
 * Greedy diversity interleaving — max N consecutive items of the same content_type.
 */
export function interleaveFeedItems(
  scoredItems,
  { maxConsecutive = FEED_MAX_CONSECUTIVE_SAME_TYPE, limit } = {},
) {
  const pool = [...scoredItems].sort((a, b) => b._score - a._score || String(b.sort_at).localeCompare(String(a.sort_at)));
  const result = [];
  const used = new Set();

  while (result.length < pool.length && (!limit || result.length < limit)) {
    let placed = false;

    for (let i = 0; i < pool.length; i += 1) {
      const item = pool[i];
      const key = item.item_key ?? item.id;
      if (used.has(key)) continue;

      const streak = countTrailingSameType(result, item.content_type);
      if (streak >= maxConsecutive) continue;

      result.push(item);
      used.add(key);
      placed = true;
      break;
    }

    if (!placed) {
      const remaining = pool.filter((entry) => !used.has(entry.item_key ?? entry.id));
      if (!remaining.length) break;
      result.push(remaining[0]);
      used.add(remaining[0].item_key ?? remaining[0].id);
    }
  }

  return limit ? result.slice(0, limit) : result;
}

export function rankAndInterleaveFeed(items, context = {}, options = {}) {
  const scored = items.map((item) => scoreFeedItem(item, context));
  const filtered = filterRelevantFeedItems(scored, context);
  return interleaveFeedItems(filtered, options);
}

const MIN_RELEVANCE_SCORE = 18;

function isFollowedPost(item, context) {
  const post = item.payload;
  const authorId = post?.author_id;
  if (!authorId) return false;
  return (
    context.followedCompanyIds?.includes(authorId) ||
    context.followedInstitutionIds?.includes(authorId)
  );
}

/** Drop posts with no personalization signal when the user has a profile. */
export function filterRelevantFeedItems(items, context = {}) {
  const hasProfile = Boolean(context.profile);
  const hasEmployerContext = Boolean(context.companyProfile);

  if (!hasProfile && !hasEmployerContext) return items;

  const relevant = items.filter((item) => {
    if (item.content_type !== FEED_CONTENT_TYPES.POST && item.content_type !== FEED_CONTENT_TYPES.ADVICE) {
      return true;
    }
    if (isFollowedPost(item, context)) return true;
    return (item._score ?? 0) >= MIN_RELEVANCE_SCORE;
  });

  return relevant.length > 0 ? relevant : items.filter((item) => isFollowedPost(item, context));
}

export function dedupeFeedItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.item_key ?? item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
