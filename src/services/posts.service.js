import { supabase } from '../config/supabase';
import { topicsService } from './topics.service';
import { normalizePostTopics, normalizePostsTopics } from '../utils/normalizePostTopics';

const POST_SELECT = `*, ${topicsService.POST_TOPICS_EMBED}`;
const POST_SELECT_BY_TOPIC = `*, post_topics!inner(topics!inner(id, name, slug))`;

async function withNormalizedTopics(result) {
  if (result.error) return result;
  if (Array.isArray(result.data)) {
    return { ...result, data: normalizePostsTopics(result.data) };
  }
  return { ...result, data: normalizePostTopics(result.data) };
}

export const postsService = {
  getByTopicSlug: async ({
    topicSlug,
    authorTypes,
    limit = 30,
    offset = 0,
  } = {}) => {
    const slug = String(topicSlug ?? '').trim();
    if (!slug) {
      return { data: [], error: new Error('topicSlug is required') };
    }

    let query = supabase
      .from('posts')
      .select(POST_SELECT_BY_TOPIC)
      .eq('is_hidden', false)
      .eq('post_topics.topics.slug', slug)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (authorTypes?.length) {
      query = query.in('author_type', authorTypes);
    }

    return withNormalizedTopics(await query);
  },

  getFeed: async ({ limit = 30, offset = 0 } = {}) => {
    const result = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return withNormalizedTopics(result);
  },

  getByAuthor: async (authorId, { limit = 30, offset = 0, includeHidden = false } = {}) => {
    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('author_id', authorId);

    if (!includeHidden) {
      query = query.eq('is_hidden', false);
    }

    const result = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return withNormalizedTopics(result);
  },

  getById: async (id, { includeHidden = false } = {}) => {
    let query = supabase.from('posts').select(POST_SELECT).eq('id', id);
    if (!includeHidden) {
      query = query.eq('is_hidden', false);
    }
    const result = await query.maybeSingle();
    return withNormalizedTopics(result);
  },

  create: (data) => supabase.from('posts').insert(data).select().single(),

  update: (id, data) => supabase.from('posts').update(data).eq('id', id).select().single(),

  delete: (id) => supabase.from('posts').delete().eq('id', id),
};
