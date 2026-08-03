export const POST_ENGAGEMENT_TYPES = {
  LIKE: 'post_like',
  COMMENT: 'post_comment',
  COMMENT_REPLY: 'post_comment_reply',
  COMMENT_LIKE: 'comment_like',
  REPOST: 'post_repost',
};

export const COMMENTS_PAGE_SIZE = 20;
export const REPLIES_PAGE_SIZE = 20;

export const EMPTY_ENGAGEMENT = {
  likes_count: 0,
  comments_count: 0,
  reposts_count: 0,
  liked_by_me: false,
  saved_by_me: false,
  reposted_by_me: false,
  hidden_by_me: false,
};
