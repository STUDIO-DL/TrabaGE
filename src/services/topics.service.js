import { supabase } from '../config/supabase';
import { normalizePostTopics } from '../utils/normalizePostTopics';

const TOPIC_SELECT = 'id, name, slug';
const POST_TOPICS_EMBED = `post_topics(topics(${TOPIC_SELECT}))`;

export const topicsService = {
  POST_TOPICS_EMBED,

  listActive: async () => {
    const { data, error } = await supabase
      .from('topics')
      .select(TOPIC_SELECT)
      .eq('is_active', true)
      .order('name', { ascending: true });

    return { data: data ?? [], error };
  },

  search: async (query = '') => {
    const trimmed = String(query ?? '').trim();
    let request = supabase
      .from('topics')
      .select(TOPIC_SELECT)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(20);

    if (trimmed) {
      request = request.ilike('name', `%${trimmed}%`);
    }

    const { data, error } = await request;
    return { data: data ?? [], error };
  },

  /**
   * Replace all topics for a post. Caller must own the post.
   * @param {string} postId
   * @param {string[]} topicIds — 1 to 3 active topic ids
   */
  setPostTopics: async (postId, topicIds = []) => {
    const uniqueIds = [...new Set((topicIds ?? []).filter(Boolean))];

    if (uniqueIds.length < 1 || uniqueIds.length > 3) {
      return {
        data: null,
        error: new Error('Selecciona entre 1 y 3 temas.'),
      };
    }

    const { error: deleteError } = await supabase
      .from('post_topics')
      .delete()
      .eq('post_id', postId);

    if (deleteError) return { data: null, error: deleteError };

    const rows = uniqueIds.map((topic_id) => ({
      post_id: postId,
      topic_id,
    }));

    const { data, error } = await supabase
      .from('post_topics')
      .insert(rows)
      .select(`topic_id, topics(${TOPIC_SELECT})`);

    if (error) return { data: null, error };

    const topics = (data ?? [])
      .map((row) => row.topics)
      .filter((topic) => topic?.id)
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        slug: topic.slug ?? null,
      }));

    return { data: topics, error: null };
  },

  getTopicsForPosts: async (postIds = []) => {
    const ids = [...new Set((postIds ?? []).filter(Boolean))];
    if (!ids.length) return { data: new Map(), error: null };

    const { data, error } = await supabase
      .from('post_topics')
      .select(`post_id, topics(${TOPIC_SELECT})`)
      .in('post_id', ids);

    if (error) return { data: new Map(), error };

    const map = new Map();
    (data ?? []).forEach((row) => {
      if (!row?.topics?.id) return;
      const list = map.get(row.post_id) ?? [];
      list.push({
        id: row.topics.id,
        name: row.topics.name,
        slug: row.topics.slug ?? null,
      });
      map.set(row.post_id, list);
    });

    return { data: map, error: null };
  },

  attachTopicsToPosts: async (posts = []) => {
    if (!posts?.length) return posts;

    const needFetch = posts.filter((p) => !Array.isArray(p.topics));
    if (!needFetch.length) {
      return posts.map(normalizePostTopics);
    }

    const { data: topicMap } = await topicsService.getTopicsForPosts(
      needFetch.map((p) => p.id),
    );

    return posts.map((post) => {
      if (Array.isArray(post.topics)) return normalizePostTopics(post);
      return {
        ...normalizePostTopics(post),
        topics: topicMap.get(post.id) ?? [],
      };
    });
  },
};
