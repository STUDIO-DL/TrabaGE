import { supabase } from '../config/supabase';
import { topicsService } from './topics.service';
import { normalizePostTopics, normalizePostsTopics } from '../utils/normalizePostTopics';

const POST_SELECT = `*, ${topicsService.POST_TOPICS_EMBED}`;

async function withNormalizedTopics(result) {
  if (result.error) return result;
  if (Array.isArray(result.data)) {
    return { ...result, data: normalizePostsTopics(result.data) };
  }
  return { ...result, data: normalizePostTopics(result.data) };
}

export const postsService = {
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
