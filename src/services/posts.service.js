import { supabase } from '../config/supabase';

export const postsService = {
  getFeed: ({ limit = 30, offset = 0 } = {}) =>
    supabase
      .from('posts')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),

  getByAuthor: (authorId, { limit = 30, offset = 0, includeHidden = false } = {}) => {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId);

    if (!includeHidden) {
      query = query.eq('is_hidden', false);
    }

    return query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  },

  getById: (id, { includeHidden = false } = {}) => {
    let query = supabase.from('posts').select('*').eq('id', id);
    if (!includeHidden) {
      query = query.eq('is_hidden', false);
    }
    return query.maybeSingle();
  },

  create: (data) => supabase.from('posts').insert(data).select().single(),

  update: (id, data) => supabase.from('posts').update(data).eq('id', id).select().single(),

  delete: (id) => supabase.from('posts').delete().eq('id', id),
};
