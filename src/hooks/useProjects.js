import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../services/projects.service';
import { storageService } from '../services/storage.service';
import { projectImagePath } from '../constants/storage';
import { validateFile } from '../utils/validateFile';
import { getSupabaseErrorMessage } from '../utils/supabaseErrors';
import {
  getOwnCandidateProfileKey,
  getOwnCompanyProfileKey,
} from '../constants/profileQueryKeys';
import {
  MAX_PROJECTS_PER_PROFILE,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
} from '../constants/projects';

function friendlyProjectError(error) {
  if (!error) return null;
  const message = error.message?.toLowerCase?.() || '';

  if (message.includes('projects_limit_exceeded') || message.includes('límite de 3')) {
    return { ...error, message: 'Has alcanzado el límite de 3 proyectos.' };
  }
  if (message.includes('violates row-level security')) {
    return { ...error, message: 'No tienes permisos para modificar este dato.' };
  }
  if (message.includes('storage') || message.includes('bucket')) {
    return { ...error, message: 'No se pudo subir la imagen. Inténtalo de nuevo.' };
  }

  return { ...error, message: getSupabaseErrorMessage(error, 'No se pudo guardar el proyecto.') };
}

function sortProjects(items = []) {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getProjectsQueryKey(userId) {
  return ['projects', userId];
}

export function useProjects(userId, { enabled = true } = {}) {
  return useQuery({
    queryKey: getProjectsQueryKey(userId),
    queryFn: async () => {
      const { data, error } = await projectsService.getByUserId(userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(userId) && enabled,
    staleTime: 30_000,
  });
}

export function useProjectMutations(userId) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(null);

  const invalidateRelatedQueries = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getProjectsQueryKey(userId) }),
      queryClient.invalidateQueries({ queryKey: ['profile', 'public', 'candidate', userId] }),
      queryClient.invalidateQueries({ queryKey: ['profile', 'public', 'company', userId] }),
      queryClient.invalidateQueries({ queryKey: getOwnCandidateProfileKey(userId) }),
      queryClient.invalidateQueries({ queryKey: getOwnCompanyProfileKey(userId) }),
    ]);
  }, [queryClient, userId]);

  const patchProfileProjects = useCallback(
    (updater) => {
      queryClient.setQueriesData({ queryKey: ['profile'] }, (current) => {
        if (!current || current.user_id !== userId) return current;
        const currentProjects = current.projects ?? [];
        const nextProjects =
          typeof updater === 'function' ? updater(currentProjects) : updater;
        return { ...current, projects: sortProjects(nextProjects) };
      });
    },
    [queryClient, userId],
  );

  const createProject = useCallback(
    async ({ title, description, imageFile }, { onProgress } = {}) => {
      if (!userId) return { data: null, error: { message: 'Usuario no autenticado.' } };

      const trimmedTitle = title?.trim?.() ?? '';
      const trimmedDescription = description?.trim?.() ?? '';

      if (!trimmedTitle) {
        return { data: null, error: { message: 'El título es obligatorio.' } };
      }
      if (!trimmedDescription) {
        return { data: null, error: { message: 'La descripción es obligatoria.' } };
      }
      if (trimmedTitle.length > PROJECT_TITLE_MAX_LENGTH) {
        return {
          data: null,
          error: { message: `El título no puede superar ${PROJECT_TITLE_MAX_LENGTH} caracteres.` },
        };
      }
      if (trimmedDescription.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
        return {
          data: null,
          error: {
            message: `La descripción no puede superar ${PROJECT_DESCRIPTION_MAX_LENGTH} caracteres.`,
          },
        };
      }
      if (!imageFile) {
        return { data: null, error: { message: 'La foto del proyecto es obligatoria.' } };
      }

      const validation = validateFile(imageFile, 'postImage');
      if (!validation.valid) {
        return { data: null, error: { message: validation.error } };
      }

      setLoading(true);

      try {
        const { count, error: countError } = await projectsService.countByUserId(userId);
        if (countError) {
          return { data: null, error: friendlyProjectError(countError) };
        }
        if (count >= MAX_PROJECTS_PER_PROFILE) {
          return {
            data: null,
            error: { message: 'Has alcanzado el límite de 3 proyectos.' },
          };
        }

        const projectId = crypto.randomUUID();
        const path = projectImagePath(userId, projectId);

        try {
          const { error: uploadError } = await storageService.uploadProjectImage(
            userId,
            projectId,
            imageFile,
            undefined,
            {
              onProgress: (payload) => {
                setUploadPhase(payload.phase);
                onProgress?.(payload);
              },
            },
          );
          if (uploadError) {
            return { data: null, error: friendlyProjectError(uploadError) };
          }
        } catch (uploadError) {
          return { data: null, error: { message: uploadError.message } };
        } finally {
          setUploadPhase(null);
        }

        const { data, error } = await projectsService.addProject({
          id: projectId,
          user_id: userId,
          title: trimmedTitle,
          description: trimmedDescription,
          image_path: path,
        });

        if (error) {
          await storageService.deleteProjectImage(userId, projectId, path);
          return { data: null, error: friendlyProjectError(error) };
        }

        patchProfileProjects((items) => [...items, data]);
        await invalidateRelatedQueries();
        return { data, error: null };
      } finally {
        setLoading(false);
      }
    },
    [invalidateRelatedQueries, patchProfileProjects, userId],
  );

  const updateProject = useCallback(
    async (projectId, { title, description, imageFile }, existingProject, { onProgress } = {}) => {
      if (!userId || !projectId) {
        return { data: null, error: { message: 'Proyecto no válido.' } };
      }

      const trimmedTitle = title?.trim?.() ?? '';
      const trimmedDescription = description?.trim?.() ?? '';

      if (!trimmedTitle) {
        return { data: null, error: { message: 'El título es obligatorio.' } };
      }
      if (!trimmedDescription) {
        return { data: null, error: { message: 'La descripción es obligatoria.' } };
      }
      if (trimmedTitle.length > PROJECT_TITLE_MAX_LENGTH) {
        return {
          data: null,
          error: { message: `El título no puede superar ${PROJECT_TITLE_MAX_LENGTH} caracteres.` },
        };
      }
      if (trimmedDescription.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
        return {
          data: null,
          error: {
            message: `La descripción no puede superar ${PROJECT_DESCRIPTION_MAX_LENGTH} caracteres.`,
          },
        };
      }
      if (!existingProject?.image_path && !imageFile) {
        return { data: null, error: { message: 'La foto del proyecto es obligatoria.' } };
      }

      if (imageFile) {
        const validation = validateFile(imageFile, 'postImage');
        if (!validation.valid) {
          return { data: null, error: { message: validation.error } };
        }
      }

      setLoading(true);

      try {
        let nextImagePath = existingProject?.image_path ?? null;

        if (imageFile) {
          try {
            const { error: uploadError } = await storageService.uploadProjectImage(
              userId,
              projectId,
              imageFile,
              existingProject?.image_path,
              {
                onProgress: (payload) => {
                  setUploadPhase(payload.phase);
                  onProgress?.(payload);
                },
              },
            );
            if (uploadError) {
              return { data: null, error: friendlyProjectError(uploadError) };
            }
          } catch (uploadError) {
            return { data: null, error: { message: uploadError.message } };
          } finally {
            setUploadPhase(null);
          }

          nextImagePath = projectImagePath(userId, projectId);
        }

        const { data, error } = await projectsService.updateProject(projectId, {
          title: trimmedTitle,
          description: trimmedDescription,
          image_path: nextImagePath,
        });

        if (error) {
          return { data: null, error: friendlyProjectError(error) };
        }

        patchProfileProjects((items) =>
          items.map((item) => (item.id === projectId ? { ...item, ...data } : item)),
        );
        await invalidateRelatedQueries();
        return { data, error: null };
      } finally {
        setLoading(false);
      }
    },
    [invalidateRelatedQueries, patchProfileProjects, userId],
  );

  const deleteProject = useCallback(
    async (project) => {
      if (!userId || !project?.id) {
        return { error: { message: 'Proyecto no válido.' } };
      }

      setLoading(true);

      try {
        const { error: storageError } = await storageService.deleteProjectImage(
          userId,
          project.id,
          project.image_path,
        );
        if (storageError) {
          return { error: friendlyProjectError(storageError) };
        }

        const { error } = await projectsService.deleteProject(project.id);
        if (error) {
          return { error: friendlyProjectError(error) };
        }

        patchProfileProjects((items) => items.filter((item) => item.id !== project.id));
        await invalidateRelatedQueries();
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    [invalidateRelatedQueries, patchProfileProjects, userId],
  );

  return {
    loading,
    uploadPhase,
    createProject,
    updateProject,
    deleteProject,
  };
}

export function useCreateProject(userId) {
  const { createProject, loading } = useProjectMutations(userId);
  return { createProject, loading };
}

export function useUpdateProject(userId) {
  const { updateProject, loading } = useProjectMutations(userId);
  return { updateProject, loading };
}

export function useDeleteProject(userId) {
  const { deleteProject, loading } = useProjectMutations(userId);
  return { deleteProject, loading };
}
