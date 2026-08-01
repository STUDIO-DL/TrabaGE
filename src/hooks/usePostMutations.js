import { createElement, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useNotificationContext } from '../context/NotificationContext';
import { postsService } from '../services/posts.service';
import { storageService } from '../services/storage.service';
import { TOAST } from '../utils/copyLabels';
import DeletePostConfirmModal from '../components/feed/DeletePostConfirmModal';

const DELETE_ERROR_TOAST =
  'No hemos podido eliminar la publicación. Inténtalo de nuevo.';

export function usePostMutations({ onSuccess } = {}) {
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = useCallback((post) => {
    if (!post?.id) return;
    if (!user?.id || post.author_id !== user.id) {
      showToast(DELETE_ERROR_TOAST, 'error');
      return;
    }
    setPendingDelete(post);
  }, [showToast, user?.id]);

  const cancelDelete = useCallback(() => {
    if (deleting) return;
    setPendingDelete(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    const post = pendingDelete;
    if (!post?.id || !user?.id) return;
    if (post.author_id !== user.id) {
      setPendingDelete(null);
      showToast(DELETE_ERROR_TOAST, 'error');
      return;
    }

    setDeleting(true);
    try {
      const { error } = await postsService.deleteOwn(post.id, user.id);
      if (error) {
        showToast(DELETE_ERROR_TOAST, 'error');
        return;
      }

      // Best-effort storage cleanup after the row is gone (RLS still allows own folder delete).
      if (post.post_image_path || post.id) {
        await storageService.deleteOldPostImage(user.id, post.id, post.post_image_path);
      }

      setPendingDelete(null);
      showToast(TOAST.postDeleted, 'success');
      onSuccess?.(post);
    } finally {
      setDeleting(false);
    }
  }, [onSuccess, pendingDelete, showToast, user?.id]);

  const deleteConfirmModal = createElement(DeletePostConfirmModal, {
    isOpen: Boolean(pendingDelete),
    onClose: cancelDelete,
    onConfirm: confirmDelete,
    loading: deleting,
  });

  return { handleEdit, handleDelete, deleteConfirmModal };
}
