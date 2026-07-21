import { supabase } from '../config/supabase';
import { executeDelete, executeWrite } from '../utils/supabaseMutation';
import { MAX_PROJECTS_PER_PROFILE } from '../constants/projects';

function sortProjectsNewestFirst(items = []) {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export const projectsService = {
  getByUserId: async (userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: sortProjectsNewestFirst(data ?? []), error };
  },

  countByUserId: async (userId) => {
    const { count, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    return { count: count ?? 0, error };
  },

  addProject: async (data) => {
    const userId = data?.user_id;
    if (userId) {
      const { count, error: countError } = await projectsService.countByUserId(userId);
      if (countError) return { data: null, error: countError };
      if (count >= MAX_PROJECTS_PER_PROFILE) {
        return {
          data: null,
          error: { message: 'Has alcanzado el límite de 3 proyectos.' },
        };
      }
    }

    return executeWrite(supabase.from('projects').insert(data).select('*').maybeSingle());
  },

  updateProject: (id, data) =>
    executeWrite(supabase.from('projects').update(data).eq('id', id).select('*').maybeSingle()),

  deleteProject: (id) =>
    executeDelete(supabase.from('projects').delete().eq('id', id).select('id')),
};
