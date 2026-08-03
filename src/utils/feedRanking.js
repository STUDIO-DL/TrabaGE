import { isEmployerAuthor } from '../constants/authorTypes';
import { calculateJobMatch, extractUserKeywords } from './calculateJobMatch';
import { getCandidateCompletenessWeight } from './profileCompleteness';
import {
  FEED_CONTENT_TYPES,
  FEED_MAX_CONSECUTIVE_SAME_TYPE,
} from '../constants/feedContentTypes';
import {
  GENERAL_TOPIC_FEED_BOOST,
  postHasGeneralTopic,
} from '../constants/topics';

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

/** Engagement lift — logarithmic so viral posts rise without drowning affinity. */
function engagementBoost(post) {
  const likes = Math.max(0, Number(post?.likes_count) || 0);
  const comments = Math.max(0, Number(post?.comments_count) || 0);
  const reposts = Math.max(0, Number(post?.reposts_count) || 0);
  const raw =
    Math.log1p(likes) * 4.5 + Math.log1p(comments) * 6.5 + Math.log1p(reposts) * 11;
  return Math.min(36, Math.round(raw));
}

function countTrailingSameType(items, contentType) {
  let count = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].content_type !== contentType) break;
    count += 1;
  }
  return count;
}

function followedAuthorIds(context = {}) {
  return new Set(
    [
      ...(context.followedCompanyIds ?? []),
      ...(context.followedInstitutionIds ?? []),
      ...(context.followedUserIds ?? []),
    ].filter(Boolean),
  );
}

function isPostFeedItem(item) {
  return (
    item?.content_type === FEED_CONTENT_TYPES.POST ||
    item?.content_type === FEED_CONTENT_TYPES.ADVICE
  );
}

/** Canonical id for original vs its reposts (collapse key). */
export function canonicalFeedPostId(post) {
  if (!post?.id) return null;
  return post.repost_of_id || post.id;
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
      const followed = followedAuthorIds(context);
      if (followed.has(post?.author_id)) {
        score += 35;
      } else if (
        isEmployerAuthor(post?.author_type) &&
        followedCompanyIds.includes(post?.author_id)
      ) {
        score += 35;
      }

      // Repost from a followed account distributes the original into the viewer’s feed.
      if (post?.repost_of_id && followed.has(post?.author_id)) {
        score += 18;
      }

      score += engagementBoost(post);

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
      // General audience topic: modest boost — expands reach, does not dominate ranking.
      if (postHasGeneralTopic(post)) score += GENERAL_TOPIC_FEED_BOOST;
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
 * Collapse original + reposts of the same post into one enriched card.
 * Prefer a followed account’s repost; otherwise keep the best-scored version
 * and attach `shared_by` when a followed account also shared it.
 */
export function collapseRepostDuplicates(items, context = {}) {
  const followed = followedAuthorIds(context);
  const groups = new Map();
  const passthrough = [];

  for (const item of items ?? []) {
    if (!isPostFeedItem(item) || !item.payload?.id) {
      passthrough.push(item);
      continue;
    }
    const key = String(canonicalFeedPostId(item.payload));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const collapsed = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      collapsed.push(group[0]);
      continue;
    }

    const followedReposts = group.filter(
      (item) => item.payload?.repost_of_id && followed.has(item.payload?.author_id),
    );

    let chosen;
    if (followedReposts.length) {
      chosen = [...followedReposts].sort(
        (a, b) =>
          (b._score ?? 0) - (a._score ?? 0) ||
          String(b.sort_at).localeCompare(String(a.sort_at)),
      )[0];
    } else {
      chosen = [...group].sort(
        (a, b) =>
          (b._score ?? 0) - (a._score ?? 0) ||
          String(b.sort_at).localeCompare(String(a.sort_at)),
      )[0];
    }

    const maxScore = Math.max(...group.map((g) => g._score ?? 0));

    // Enrich an original with “Compartido por …” when a followed account also reposted.
    if (chosen && !chosen.payload?.repost_of_id && followedReposts.length) {
      const sharer = followedReposts[0].payload;
      chosen = {
        ...chosen,
        payload: {
          ...chosen.payload,
          shared_by: {
            id: sharer.author_id,
            name: sharer.author_name,
          },
        },
        _score: Math.max(chosen._score ?? 0, maxScore),
      };
    } else if (chosen) {
      chosen = { ...chosen, _score: Math.max(chosen._score ?? 0, maxScore) };
    }

    collapsed.push(chosen);
  }

  return [...passthrough, ...collapsed];
}

/**
 * Greedy diversity interleaving — max N consecutive items of the same content_type.
 */
export function interleaveFeedItems(
  scoredItems,
  { maxConsecutive = FEED_MAX_CONSECUTIVE_SAME_TYPE, limit } = {},
) {
  const pool = [...scoredItems].sort(
    (a, b) => b._score - a._score || String(b.sort_at).localeCompare(String(a.sort_at)),
  );
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
  const collapsed = collapseRepostDuplicates(scored, context);
  const filtered = filterRelevantFeedItems(collapsed, context);
  return interleaveFeedItems(filtered, options);
}

const MIN_RELEVANCE_SCORE = 18;

function isFollowedPost(item, context) {
  const post = item.payload;
  const authorId = post?.author_id;
  if (!authorId) return false;
  return followedAuthorIds(context).has(authorId);
}

/** Drop posts with no personalization signal when the user has a profile. */
export function filterRelevantFeedItems(items, context = {}) {
  const hasProfile = Boolean(context.profile);
  const hasEmployerContext = Boolean(context.companyProfile);

  if (!hasProfile && !hasEmployerContext) return items;

  const relevant = items.filter((item) => {
    if (
      item.content_type !== FEED_CONTENT_TYPES.POST &&
      item.content_type !== FEED_CONTENT_TYPES.ADVICE
    ) {
      return true;
    }
    if (isFollowedPost(item, context)) return true;
    // High-engagement posts stay visible even without affinity.
    if (engagementBoost(item.payload) >= 12) return true;
    return (item._score ?? 0) >= MIN_RELEVANCE_SCORE;
  });

  return relevant.length > 0 ? relevant : items.filter((item) => isFollowedPost(item, context));
}

export function dedupeFeedItems(items) {
  const seen = new Set();
  const byCanonical = new Set();
  return items.filter((item) => {
    const key = item.item_key ?? item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);

    if (isPostFeedItem(item) && item.payload?.id) {
      const canonical = String(canonicalFeedPostId(item.payload));
      if (byCanonical.has(canonical)) return false;
      byCanonical.add(canonical);
    }
    return true;
  });
}
