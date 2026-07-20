/**
 * Normalize embedded post_topics → topics[] on a post row.
 * PostgREST shape: post_topics: [{ topics: { id, name, slug } }, ...]
 */
export function normalizePostTopics(post) {
  if (!post) return post;

  if (Array.isArray(post.topics) && post.topics.length && post.topics[0]?.id) {
    return post;
  }

  const embedded = post.post_topics;
  const topics = Array.isArray(embedded)
    ? embedded
        .map((row) => row?.topics ?? row?.topic ?? null)
        .filter((topic) => topic?.id && topic?.name)
        .map((topic) => ({
          id: topic.id,
          name: topic.name,
          slug: topic.slug ?? null,
        }))
    : [];

  const { post_topics: _omit, ...rest } = post;
  return { ...rest, topics };
}

export function normalizePostsTopics(posts) {
  return (posts ?? []).map(normalizePostTopics);
}
