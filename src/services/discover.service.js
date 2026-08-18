import { getDiscoverSectionById } from '../constants/discoverSections';
import { postsService } from './posts.service';
import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';
import { rankDiscoverPeople } from '../utils/discoverPeopleEligibility';
import { authService } from './auth.service';

const FALLBACK_POOL = 120;

async function loadViewerContext(userId) {
  const [{ data: candidate }, { data: company }] = await Promise.all([
    supabase
      .from('candidate_profiles')
      .select('sector, headline, city, country')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('company_profiles')
      .select('sector, city, country')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (candidate && (candidate.sector || candidate.city || candidate.country || candidate.headline)) {
    return {
      sector: candidate.sector || '',
      headline: candidate.headline || '',
      city: candidate.city || '',
      country: candidate.country || '',
    };
  }

  return {
    sector: company?.sector || '',
    headline: '',
    city: company?.city || '',
    country: company?.country || '',
  };
}

async function loadFollowedPersonalIds(userId) {
  const { data, error } = await supabase
    .from('follows')
    .select('target_id')
    .eq('user_id', userId)
    .in('target_type', ['personal', 'user', 'candidate', 'people']);

  if (error) {
    if (import.meta.env.DEV) {
      console.debug('[discover-people:fallback]', { stage: 'follows_error', message: error.message });
    }
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.target_id).filter(Boolean));
}

/**
 * Client fallback when RPC returns empty (e.g. legacy setup_complete gate)
 * or is temporarily unavailable. Uses authenticated SELECT on active profiles.
 */
async function recommendPeopleClientFallback({ limit = 20, offset = 0 } = {}) {
  const {
    data: { session },
  } = await authService.getSession();
  const me = session?.user?.id;
  if (!me) {
    return { data: [], error: { message: 'Authentication required' } };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 40);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [viewer, followedIds, profilesResult] = await Promise.all([
    loadViewerContext(me),
    loadFollowedPersonalIds(me),
    supabase
      .from('candidate_profiles')
      .select('user_id, full_name, headline, avatar_path, sector, city, country, is_active, updated_at')
      .eq('is_active', true)
      .neq('user_id', me)
      .not('full_name', 'is', null)
      .neq('full_name', '')
      .order('updated_at', { ascending: false })
      .limit(FALLBACK_POOL),
  ]);

  if (profilesResult.error) {
    reportError(profilesResult.error, { area: 'discover_people_client_fallback' });
    return { data: [], error: profilesResult.error };
  }

  const profiles = (profilesResult.data ?? []).filter((p) => String(p.full_name || '').trim());
  const ranked = rankDiscoverPeople(profiles, viewer, {
    viewerId: me,
    followedIds,
    role: 'personal',
  });

  const page = ranked.slice(safeOffset, safeOffset + safeLimit).map((row) => ({
    user_id: row.user_id,
    full_name: row.full_name,
    headline: row.headline,
    avatar_path: row.avatar_path,
    username: null,
    relevance_score: row.relevance_score,
  }));

  if (import.meta.env.DEV) {
    console.debug('[discover-people:fallback]', {
      pool: profiles.length,
      ranked: ranked.length,
      followedExcluded: followedIds.size,
      returned: page.length,
      offset: safeOffset,
      limit: safeLimit,
      viewer,
    });
  }

  return { data: page, error: null };
}

export const discoverService = {
  /**
   * Publications for a Discover section.
   * Only posts explicitly tagged with the section topic (via post_topics) are returned.
   * No keyword inference and no unfiltered feed fallback.
   */
  getSectionPosts: async (sectionId, { limit = 30, offset = 0 } = {}) => {
    const section = getDiscoverSectionById(sectionId);
    if (!section?.topicSlug) {
      return { data: [], error: null };
    }

    const { data, error } = await postsService.getByTopicSlug({
      topicSlug: section.topicSlug,
      authorTypes: section.authorTypes,
      limit,
      offset,
    });

    if (error) {
      return { data: [], error };
    }

    return {
      data: (data ?? []).filter((post) => post && !post.is_hidden),
      error: null,
    };
  },

  /**
   * Personalized people recommendations for Descubrir personas.
   * Uses recommend_discover_people RPC; falls back to client ranking if empty/unavailable.
   */
  getRecommendedPeople: async ({ limit = 20, offset = 0 } = {}) => {
    const { data, error } = await supabase.rpc('recommend_discover_people', {
      p_limit: limit,
      p_offset: offset,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      if (import.meta.env.DEV) {
        console.debug('[discover-people:service]', {
          ok: true,
          source: 'rpc',
          limit,
          offset,
          count: data.length,
        });
      }
      return { data, error: null };
    }

    if (error) {
      reportError(error, { area: 'discover_people_recommend', limit, offset });
      if (import.meta.env.DEV) {
        console.debug('[discover-people:service]', {
          ok: false,
          source: 'rpc',
          limit,
          offset,
          code: error.code,
          message: error.message,
          fallingBack: true,
        });
      }
    } else if (import.meta.env.DEV) {
      console.debug('[discover-people:service]', {
        ok: true,
        source: 'rpc_empty',
        limit,
        offset,
        fallingBack: true,
      });
    }

    const fallback = await recommendPeopleClientFallback({ limit, offset });
    if (fallback.error && (!fallback.data || fallback.data.length === 0)) {
      // Prefer original RPC error if fallback also failed.
      return { data: [], error: error || fallback.error };
    }

    return { data: fallback.data ?? [], error: null };
  },
};
