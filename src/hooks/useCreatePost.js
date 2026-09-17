import { useState } from 'react';
import { postsService } from '../services/posts.service';
import { topicsService } from '../services/topics.service';
import { notificationsService } from '../services/notifications.service';
import { storageService } from '../services/storage.service';
import { postImagePath } from '../constants/storage';
import { authorTypeFromRole } from '../constants/authorTypes';
import { useAuth } from './useAuth';
import { useNotificationContext } from '../context/NotificationContext';
import { GUEST_MODE_MESSAGE } from '../utils/guestMode';
import { validateFile } from '../utils/validateFile';
import { getSupabaseErrorMessage } from '../utils/supabaseErrors';
import { TOAST } from '../utils/copyLabels';
import { getConnectivityState } from '../utils/connectivity';

export function useCreatePost() {
  const { user, isPreviewMode, role } = useAuth();
  const { showToast, showErrorToast } = useNotificationContext();
  const [loading, setLoading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(null);

  const createPost = async ({ content, imageFile, topicIds = [] }) => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return { ok: false };
    }

    if (getConnectivityState().offline) {
      showToast(
        'Sin conexión. Tu borrador se ha guardado; publícalo cuando vuelva Internet.',
        'info',
      );
      return { ok: false, offline: true };
    }

    const trimmedContent = content?.trim?.() ?? '';
    const uniqueTopicIds = [...new Set((topicIds ?? []).filter(Boolean))];

    if (!trimmedContent && !imageFile) {
      showToast('Escribe algo o añade una imagen.', 'error');
      return { ok: false };
    }

    if (uniqueTopicIds.length < 1 || uniqueTopicIds.length > 3) {
      showToast('Selecciona entre 1 y 3 temas.', 'error');
      return { ok: false };
    }

    if (imageFile) {
      const validation = validateFile(imageFile, 'postImage');
      if (!validation.valid) {
        showToast(validation.error, 'error');
        return { ok: false };
      }
    }

    setLoading(true);

    const { data: post, error } = await postsService.create({
      author_id: user.id,
      author_type: authorTypeFromRole(role),
      content: trimmedContent,
    });

    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo crear la publicación.'), 'error');
      setLoading(false);
      return { ok: false };
    }

    const { data: topics, error: topicsError } = await topicsService.setPostTopics(
      post.id,
      uniqueTopicIds,
    );

    if (topicsError) {
      await postsService.delete(post.id);
      showToast(
        getSupabaseErrorMessage(topicsError, 'No se pudieron asignar los temas. Inténtalo de nuevo.'),
        'error',
      );
      setLoading(false);
      return { ok: false };
    }

    let savedPost = { ...post, topics: topics ?? [] };

    if (imageFile && post?.id) {
      try {
        const { error: uploadError } = await storageService.uploadPostImage(
          user.id,
          post.id,
          imageFile,
          undefined,
          {
            onProgress: ({ phase }) => setUploadPhase(phase),
          },
        );

        if (uploadError) {
          showToast(
            getSupabaseErrorMessage(uploadError, 'Publicación creada, pero la imagen no se pudo subir'),
            'error',
          );
          setUploadPhase(null);
          setLoading(false);
          return { ok: false, partial: true, post: savedPost };
        }
      } catch (uploadError) {
        showErrorToast(uploadError, 'upload_image');
        setUploadPhase(null);
        setLoading(false);
        return { ok: false, partial: true, post: savedPost };
      }

      const path = postImagePath(user.id, post.id);
      const { data: updatedPost, error: updateError } = await postsService.update(post.id, {
        post_image_path: path,
      });

      if (updateError) {
        showToast(
          getSupabaseErrorMessage(
            updateError,
            'Publicación creada, pero la imagen no se pudo vincular',
          ),
          'error',
        );
        setLoading(false);
        return { ok: false, partial: true, post: savedPost };
      }

      savedPost = {
        ...(updatedPost ?? { ...post, post_image_path: path }),
        topics: savedPost.topics,
      };
      setUploadPhase(null);
    }

    const preview = trimmedContent.slice(0, 120);
    void notificationsService.notifyPostRecommendation(savedPost.id, {
      actorId: user.id,
      preview,
    });

    showToast(TOAST.postCreated, 'success');
    setUploadPhase(null);
    setLoading(false);
    return { ok: true, post: savedPost };
  };

  return { createPost, loading, uploadPhase };
}
