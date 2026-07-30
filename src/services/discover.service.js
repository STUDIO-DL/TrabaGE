import { getDiscoverSectionById } from '../constants/discoverSections';
import { postsService } from './posts.service';
import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

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
   * Uses recommend_discover_people RPC (scored, paginated).
   */
  getRecommendedPeople: async ({ limit = 20, offset = 0 } = {}) => {
    const { data, error } = await supabase.rpc('recommend_discover_people', {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      reportError(error, { area: 'discover_people_recommend', limit, offset });
      return { data: [], error };
    }

    return { data: data ?? [], error: null };
  },
};
