import { useState } from 'react';
import { postsService } from '../services/posts.service';
import { storageService } from '../services/storage.service';
import { postImagePath } from '../constants/storage';
import { ROLES } from '../constants/roles';
import { useAuth } from './useAuth';
import { useNotificationContext } from '../context/NotificationContext';
import { GUEST_MODE_MESSAGE } from '../utils/guestMode';
import { compressPostImage } from '../utils/imageCompression';
import { validateFile } from '../utils/validateFile';

export function useCreatePost() {
  const { user, isPreviewMode, role } = useAuth();
  const { showToast } = useNotificationContext();
  const [loading, setLoading] = useState(false);

  const createPost = async ({ content, imageFile }) => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
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
      author_type: role === ROLES.COMPANY ? 'company' : 'candidate',
      content,
    });

    if (error) {
      showToast(error.message, 'error');
      setLoading(false);
      return { ok: false };
    }

    if (imageFile && post?.id) {
      let compressed;
      try {
        compressed = await compressPostImage(imageFile);
      } catch (compressError) {
        showToast(compressError.message, 'error');
        setLoading(false);
        return { ok: true, post };
      }

      const { error: uploadError } = await storageService.uploadPostImage(
        user.id,
        post.id,
        compressed,
      );

      if (uploadError) {
        showToast('Publicación creada, pero la imagen no se pudo subir', 'error');
        setLoading(false);
        return { ok: true, post };
      }

      const path = postImagePath(user.id, post.id);
      await postsService.update(post.id, { post_image_path: path });
    }

    showToast('Publicación creada', 'success');
    setLoading(false);
    return { ok: true, post };
  };

  return { createPost, loading };
}
