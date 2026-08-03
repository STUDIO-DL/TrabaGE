import { supabase } from '../../../config/supabase';
import { notificationsService } from '../../../services/notifications.service';
import { postsService } from '../../../services/posts.service';
import { topicsService } from '../../../services/topics.service';
import { normalizePostTopics, normalizePostsTopics } from '../../../utils/normalizePostTopics';
import { DEEP_LINK_PATHS } from '../../../utils/deepLinks';
import { resolveAuthorAvatar } from '../../../constants/avatarDefaults';
import { resolvePostAuthorName } from '../../../utils/displayIdentity';
import { isEmployerAuthor } from '../../../constants/authorTypes';
import { ROLES } from '../../../constants/roles';
import { POST_ENGAGEMENT_TYPES, COMMENTS_PAGE_SIZE, REPLIES_PAGE_SIZE } from '../domain/constants';

const POST_SELECT = `*, ${topicsService.POST_TOPICS_EMBED}`;

async function resolveActorLabel(userId) {
  if (!userId) return 'Alguien';
  const [{ data: candidate }, { data: company }] = await Promise.all([
    supabase
      .from('candidate_profiles_public')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('company_profiles')
      .select('company_name')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  return (
    company?.company_name?.trim() ||
    candidate?.full_name?.trim() ||
    'Alguien'
  );
}

async function notifyEngagement({
  recipientId,
  type,
  title,
  body,
  postId,
  commentId = null,
  actorId,
}) {
  if (!recipientId || !actorId || recipientId === actorId) return;
  await notificationsService.notifyUser({
    recipientId,
    type,
    title,
    body,
    metadata: {
      post_id: postId,
      ...(commentId ? { comment_id: commentId } : {}),
      actor_id: actorId,
      link: DEEP_LINK_PATHS.post(postId),
      target_type: 'post',
      target_id: postId,
    },
    pushData: {
      type,
      post_id: postId,
      ...(commentId ? { comment_id: commentId } : {}),
      actor_id: actorId,
      target_id: postId,
      link: DEEP_LINK_PATHS.post(postId),
    },
  });
}

async function enrichCommentAuthors(comments) {
  if (!comments?.length) return comments ?? [];
  const ids = [...new Set(comments.map((c) => c.author_id).filter(Boolean))];
  if (!ids.length) return comments;

  const [{ data: candidates }, { data: companies }] = await Promise.all([
    supabase
      .from('candidate_profiles_public')
      .select('user_id, full_name, headline, avatar_path')
      .in('user_id', ids),
    supabase
      .from('company_profiles')
      .select('user_id, company_name, logo_path, company_type, is_verified, verification_status')
      .in('user_id', ids),
  ]);

  const candidateMap = new Map((candidates ?? []).map((row) => [row.user_id, row]));
  const companyMap = new Map((companies ?? []).map((row) => [row.user_id, row]));

  return comments.map((comment) => {
    const company = companyMap.get(comment.author_id);
    const candidate = candidateMap.get(comment.author_id);
    if (company) {
      return {
        ...comment,
        author_name: resolvePostAuthorName(comment, company, ROLES.BUSINESS),
        author_headline: '',
        author_type: 'business',
        author_avatar: resolveAuthorAvatar('business', {
          logoPath: company.logo_path,
          companyType: company.company_type,
          profile: company,
        }),
      };
    }
    return {
      ...comment,
      author_name: resolvePostAuthorName(comment, candidate, ROLES.PERSONAL),
      author_headline: candidate?.headline ?? '',
      author_type: 'personal',
      author_avatar: resolveAuthorAvatar('personal', {
        avatarPath: candidate?.avatar_path,
      }),
    };
  });
}

export const postEngagementService = {
  getEngagementMap: async (postIds = []) => {
    const ids = [...new Set(postIds.filter(Boolean))];
    if (!ids.length) return { data: {}, error: null };

    const { data, error } = await supabase.rpc('get_posts_engagement', {
      p_post_ids: ids,
    });
    if (error) return { data: {}, error };

    const map = {};
    (data ?? []).forEach((row) => {
      map[row.post_id] = row;
    });
    return { data: map, error: null };
  },

  toggleLike: async (postId, { actorId, postAuthorId, actorLabel } = {}) => {
    const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId });
    if (error) return { data: null, error };

    if (data?.liked && postAuthorId && actorId) {
      const name = actorLabel || (await resolveActorLabel(actorId));
      void notifyEngagement({
        recipientId: postAuthorId,
        type: POST_ENGAGEMENT_TYPES.LIKE,
        title: `${name} le dio Me gusta a tu publicación`,
        body: null,
        postId,
        actorId,
      });
    }
    return { data, error: null };
  },

  toggleCommentLike: async (commentId, { actorId, commentAuthorId, postId, actorLabel } = {}) => {
    const { data, error } = await supabase.rpc('toggle_comment_like', {
      p_comment_id: commentId,
    });
    if (error) return { data: null, error };

    if (data?.liked && commentAuthorId && actorId && postId) {
      const name = actorLabel || (await resolveActorLabel(actorId));
      void notifyEngagement({
        recipientId: commentAuthorId,
        type: POST_ENGAGEMENT_TYPES.COMMENT_LIKE,
        title: `${name} le dio Me gusta a tu comentario`,
        body: null,
        postId,
        commentId,
        actorId,
      });
    }
    return { data, error: null };
  },

  toggleSave: async (postId) => {
    const { data, error } = await supabase.rpc('toggle_saved_post', { p_post_id: postId });
    return { data, error };
  },

  hidePost: async (postId) => {
    const { data, error } = await supabase.rpc('hide_post_for_me', { p_post_id: postId });
    return { data, error };
  },

  createComment: async ({
    postId,
    body,
    parentId = null,
    actorId,
    postAuthorId,
    parentAuthorId = null,
    actorLabel,
  }) => {
    const { data, error } = await supabase.rpc('create_post_comment', {
      p_post_id: postId,
      p_body: body,
      p_parent_id: parentId,
    });
    if (error) return { data: null, error };

    const [enriched] = await enrichCommentAuthors([data]);
    const name = actorLabel || (await resolveActorLabel(actorId));
    const preview = String(body || '').trim().slice(0, 120);

    if (parentId && parentAuthorId) {
      void notifyEngagement({
        recipientId: parentAuthorId,
        type: POST_ENGAGEMENT_TYPES.COMMENT_REPLY,
        title: `${name} respondió a tu comentario`,
        body: preview,
        postId,
        commentId: data.id,
        actorId,
      });
    } else if (postAuthorId) {
      void notifyEngagement({
        recipientId: postAuthorId,
        type: POST_ENGAGEMENT_TYPES.COMMENT,
        title: `${name} comentó tu publicación`,
        body: preview,
        postId,
        commentId: data.id,
        actorId,
      });
    }

    return { data: enriched, error: null };
  },

  listComments: async (postId, { limit = COMMENTS_PAGE_SIZE, offset = 0 } = {}) => {
    const { data, error } = await supabase.rpc('list_post_comments', {
      p_post_id: postId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) return { data: [], error };
    return { data: await enrichCommentAuthors(data ?? []), error: null };
  },

  listReplies: async (parentId, { limit = REPLIES_PAGE_SIZE, offset = 0 } = {}) => {
    const { data, error } = await supabase.rpc('list_comment_replies', {
      p_parent_id: parentId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) return { data: [], error };
    return { data: await enrichCommentAuthors(data ?? []), error: null };
  },

  createRepost: async ({
    postId,
    commentary = null,
    authorType = 'personal',
    actorId,
    postAuthorId,
    actorLabel,
  }) => {
    const { data, error } = await supabase.rpc('create_post_repost', {
      p_post_id: postId,
      p_commentary: commentary,
      p_author_type: authorType,
    });
    if (error) return { data: null, error };

    if (postAuthorId && actorId) {
      const name = actorLabel || (await resolveActorLabel(actorId));
      void notifyEngagement({
        recipientId: postAuthorId,
        type: POST_ENGAGEMENT_TYPES.REPOST,
        title: `${name} compartió tu publicación`,
        body: commentary ? String(commentary).trim().slice(0, 120) : null,
        postId,
        actorId,
      });
    }
    return { data, error: null };
  },

  listSavedPosts: async ({ limit = 30, offset = 0 } = {}) => {
    const { data: rows, error } = await supabase
      .from('saved_posts')
      .select('post_id, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return { data: [], error };
    const ids = (rows ?? []).map((r) => r.post_id).filter(Boolean);
    if (!ids.length) return { data: [], error: null };

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .in('id', ids)
      .eq('is_hidden', false);

    if (postsError) return { data: [], error: postsError };

    const normalized = normalizePostsTopics(posts ?? []);
    const byId = new Map(normalized.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    const enriched = await postEngagementService.enrichPostsForFeed(ordered);
    return { data: enriched, error: null };
  },

  countSavedPosts: async () => {
    const { count, error } = await supabase
      .from('saved_posts')
      .select('post_id', { count: 'exact', head: true });
    return { count: count ?? 0, error };
  },

  getOriginalPost: async (postId) => {
    if (!postId) return { data: null, error: null };
    const result = await postsService.getById(postId);
    if (result.error) return result;
    return { data: normalizePostTopics(result.data), error: null };
  },

  enrichPostsForFeed: async (posts) => {
    if (!posts?.length) return posts ?? [];
    const ids = [...new Set(posts.map((p) => p.author_id).filter(Boolean))];
    const [{ data: candidates }, { data: companies }] = await Promise.all([
      supabase
        .from('candidate_profiles_public')
        .select('user_id, full_name, headline, avatar_path')
        .in('user_id', ids),
      supabase
        .from('company_profiles')
        .select('user_id, company_name, logo_path, company_type, is_verified, verification_status')
        .in('user_id', ids),
    ]);
    const candidateMap = new Map((candidates ?? []).map((row) => [row.user_id, row]));
    const companyMap = new Map((companies ?? []).map((row) => [row.user_id, row]));

    return posts.map((post) => {
      if (isEmployerAuthor(post.author_type)) {
        const company = companyMap.get(post.author_id);
        return {
          ...post,
          author_name: resolvePostAuthorName(post, company, ROLES.BUSINESS),
          author_avatar: resolveAuthorAvatar(post.author_type, {
            logoPath: company?.logo_path,
            companyType: company?.company_type,
            profile: company,
          }),
          author_company: company,
        };
      }
      const candidate = candidateMap.get(post.author_id);
      return {
        ...post,
        author_name: resolvePostAuthorName(post, candidate, ROLES.PERSONAL),
        author_headline: candidate?.headline ?? '',
        author_avatar: resolveAuthorAvatar(post.author_type, {
          avatarPath: candidate?.avatar_path,
        }),
      };
    });
  },
};
