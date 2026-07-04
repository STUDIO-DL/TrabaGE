import { supabase } from '../config/supabase';

export const postsService = {
  getFeed: ({ limit = 30, offset = 0 } = {}) =>
    supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),

  getByAuthor: (authorId, { limit = 30, offset = 0 } = {}) =>
    supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),

  getById: (id) =>
    supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle(),

  create: (data) => supabase.from('posts').insert(data).select().single(),

  update: (id, data) => supabase.from('posts').update(data).eq('id', id).select().single(),

  delete: (id) => supabase.from('posts').delete().eq('id', id),
};
