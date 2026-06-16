import { supabase } from '../config/supabase';

export const postsService = {
  getFeed: (limit = 20) =>
    supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),

  getByAuthor: (authorId) =>
    supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false }),

  create: (data) => supabase.from('posts').insert(data).select().single(),

  update: (id, data) => supabase.from('posts').update(data).eq('id', id).select().single(),

  delete: (id) => supabase.from('posts').delete().eq('id', id),
};
