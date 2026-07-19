import { useCallback } from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import { postsService } from '../services/posts.service';
import { storageService } from '../services/storage.service';
import { STORAGE_BUCKETS } from '../constants/storage';
import { TOAST } from '../utils/copyLabels';

export function usePostMutations({ onSuccess } = {}) {
  const { showToast } = useNotificationContext();

  const handleEdit = useCallback(
    async (post) => {
      const content = window.prompt('Editar publicación', post.content || '');
      if (content === null) return;
      const trimmed = content.trim();
      if (!trimmed && !post.post_image_path) {
        showToast('La publicación no puede estar vacía.', 'error');
        return;
      }

      const { error } = await postsService.update(post.id, { content: trimmed });
      if (error) {
        showToast('No se pudo actualizar la publicación.', 'error');
        return;
      }

      showToast(TOAST.postUpdated, 'success');
      onSuccess?.();
    },
    [onSuccess, showToast],
  );

  const handleDelete = useCallback(
    async (post) => {
      const ok = window.confirm('¿Eliminar esta publicación?');
      if (!ok) return;

      const { error } = await postsService.delete(post.id);
      if (error) {
        showToast('No se pudo eliminar la publicación.', 'error');
        return;
      }

      if (post.post_image_path) {
        await storageService.deleteFile(STORAGE_BUCKETS.POST_IMAGES, post.post_image_path);
      }

      showToast(TOAST.postDeleted, 'success');
      onSuccess?.(post);
    },
    [onSuccess, showToast],
  );

  return { handleEdit, handleDelete };
}
