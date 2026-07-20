import { getDiscoverSectionById } from '../constants/discoverSections';
import { postsService } from './posts.service';

export const discoverService = {
  /**
   * Publications for a Discover section, filtered by Tema (and optional author type).
   */
  getSectionPosts: async (sectionId, { limit = 30, offset = 0 } = {}) => {
    const section = getDiscoverSectionById(sectionId);
    if (!section?.topicSlug) {
      return { data: [], error: null };
    }

    return postsService.getByTopicSlug({
      topicSlug: section.topicSlug,
      authorTypes: section.authorTypes,
      limit,
      offset,
    });
  },
};
