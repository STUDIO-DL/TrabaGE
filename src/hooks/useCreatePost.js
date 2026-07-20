import { useState } from 'react';
import { postsService } from '../services/posts.service';
import { topicsService } from '../services/topics.service';
import { notificationsService } from '../services/notifications.service';
import { companyService } from '../services/company.service';
import { FOLLOWS_TARGET } from '../services/follows.service';
import { storageService } from '../services/storage.service';
import { postImagePath } from '../constants/storage';
import { isEmployerRole, isOrganizationRole } from '../constants/roles';
import { authorTypeFromRole } from '../constants/authorTypes';
import { useAuth } from './useAuth';
import { useNotificationContext } from '../context/NotificationContext';
import { GUEST_MODE_MESSAGE } from '../utils/guestMode';
import { getCompanyDisplayName } from '../utils/companyProfile';
import { validateFile } from '../utils/validateFile';
import { getSupabaseErrorMessage } from '../utils/supabaseErrors';
import { TOAST } from '../utils/copyLabels';

export function useCreatePost() {
  const { user, isPreviewMode, role } = useAuth();
  const { showToast } = useNotificationContext();
  const [loading, setLoading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(null);

  const createPost = async ({ content, imageFile, topicIds = [] }) => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return { ok: false };
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
          // #region agent log
          fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'A',location:'useCreatePost.js:imageUploadFail',message:'image fail returns ok:false partial',data:{postId:post?.id??null,ok:false},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          return { ok: false, partial: true, post: savedPost };
        }
      } catch (uploadError) {
        showToast(uploadError.message, 'error');
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

    if (isEmployerRole(role)) {
      const { data: companyProfile } = await companyService.getCompanyProfile(user.id);
      const companyName = getCompanyDisplayName(companyProfile, { role, user, warnIfMissing: true });
      if (!companyName) {
        setLoading(false);
        return { ok: true, post: savedPost };
      }
      const preview = trimmedContent.slice(0, 120);
      const targetType = isOrganizationRole(role)
        ? FOLLOWS_TARGET.ORGANIZATION
        : FOLLOWS_TARGET.BUSINESS;

      await notificationsService.notifyFollowers({
        targetType,
        targetId: user.id,
        type: 'new_post',
        title: companyName ? `Nueva publicación de ${companyName}` : 'Nueva publicación',
        message: preview || 'Nueva actualización',
        link: `/companies/${user.id}`,
      });
    }

    showToast(TOAST.postCreated, 'success');
    setUploadPhase(null);
    setLoading(false);
    return { ok: true, post: savedPost };
  };

  return { createPost, loading, uploadPhase };
}
