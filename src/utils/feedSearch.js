import { isPersonalAuthor } from '../constants/authorTypes';
export function filterPostsByQuery(posts, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return posts;

  return posts.filter((post) => {
    const haystack = [
      post.content,
      post.author_name,
      post.author_headline,
      isPersonalAuthor(post.author_type) ? 'persona' : 'negocio',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function filterCandidatePostsByQuery(posts, query) {
  const normalized = query.trim().toLowerCase();
  const candidatePosts = posts.filter((post) => isPersonalAuthor(post.author_type));
  if (!normalized) return candidatePosts;

  return candidatePosts.filter((post) => {
    const haystack = [post.content, post.author_name, post.author_headline]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalized);
  });
}
