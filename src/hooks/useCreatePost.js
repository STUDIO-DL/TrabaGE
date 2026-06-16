import { useState } from 'react';
import { postsService } from '../services/posts.service';
import { storageService } from '../services/storage.service';
import { ROLES } from '../constants/roles';
import { useAuth } from './useAuth';
import { useNotificationContext } from '../context/NotificationContext';
import { GUEST_MODE_MESSAGE } from '../utils/guestMode';

export function useCreatePost() {
  const { user, isPreviewMode, role } = useAuth();
  const { showToast } = useNotificationContext();
  const [loading, setLoading] = useState(false);

  const createPost = async ({ content, imageFile }) => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return { ok: false };
    }

    setLoading(true);

    const { data: post, error } = await postsService.create({
      author_id: user.id,
      author_type: role === ROLES.COMPANY ? 'company' : 'candidate',
      content,
    });

    if (error) {
      showToast(error.message, 'error');
      setLoading(false);
      return { ok: false };
    }

    if (imageFile && post?.id) {
      const { error: uploadError } = await storageService.uploadPostImage(
        user.id,
        post.id,
        imageFile,
      );

      if (uploadError) {
        showToast('Publicación creada, pero la imagen no se pudo subir', 'error');
        setLoading(false);
        return { ok: true, post };
      }

      const { data: urlData } = storageService.getPublicUrl(
        'post-images',
        `${user.id}/posts/${post.id}.jpg`,
      );
      await postsService.update(post.id, { image_url: urlData.publicUrl });
    }

    showToast('Publicación creada', 'success');
    setLoading(false);
    return { ok: true, post };
  };

  return { createPost, loading };
}
