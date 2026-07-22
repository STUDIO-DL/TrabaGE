import { getDiscoverSectionById } from '../constants/discoverSections';
import { postsService } from './posts.service';

const DISCOVER_SECTION_KEYWORDS = {
  hiring: ['contratacion', 'empleo', 'trabajo', 'vacante', 'oferta', 'contratar', 'reclutamiento', 'candidatura'],
  scholarships: ['beca', 'ayuda', 'convocatoria', 'educacion', 'estudio', 'subvencion'],
  internships: ['practicas', 'pasantia', 'formacion', 'aprendizaje', 'formacion-profesional'],
  events: ['evento', 'conferencia', 'feria', 'networking', 'charla', 'seminario', 'webinar', 'actividad'],
  calls: ['convocatoria', 'inscripcion', 'postulacion', 'apertura', 'solicitud'],
  courses: ['curso', 'certificacion', 'capacitacion', 'formacion', 'bootcamp'],
  entrepreneurs: ['emprendedor', 'emprendimiento', 'startup', 'negocio', 'proyecto'],
  volunteering: ['voluntariado', 'voluntario', 'solidario', 'social', 'comunidad'],
  international: ['internacional', 'global', 'extranjero', 'movilidad', 'oportunidad'],
};

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9áéíóúñ]+/gi, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean);
}

function recencyScore(createdAt) {
  if (!createdAt) return 0;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = Math.max(0, ageMs / 86_400_000);
  if (ageDays <= 1) return 24;
  if (ageDays <= 7) return 16;
  if (ageDays <= 30) return 8;
  return 2;
}

function scorePostForSection(post, section) {
  const topicText = (post?.topics ?? [])
    .map((topic) => [topic?.name, topic?.slug].filter(Boolean).join(' '))
    .join(' ');
  const haystack = [post?.content, post?.title, post?.author_name, topicText].filter(Boolean).join(' ');
  const tokens = new Set(tokenize(haystack));
  const sectionKeywords = [
    section?.title,
    section?.topicSlug,
    ...(DISCOVER_SECTION_KEYWORDS[section?.id] ?? []),
  ].filter(Boolean);
  const keywordTokens = new Set(sectionKeywords.flatMap(tokenize));

  const exactTopicMatch = (post?.topics ?? []).some((topic) => {
    const slug = normalizeText(topic?.slug || topic?.name);
    return Boolean(slug) && slug.includes(normalizeText(section?.topicSlug ?? ''));
  });

  const topicOverlap = (post?.topics ?? []).some((topic) => {
    const label = normalizeText([topic?.name, topic?.slug].filter(Boolean).join(' '));
    return Boolean(label) && keywordTokens.has(label);
  });

  const keywordOverlap = [...tokens].filter((token) => keywordTokens.has(token)).length;
  const score =
    (exactTopicMatch ? 70 : 0) +
    (topicOverlap ? 20 : 0) +
    Math.min(30, keywordOverlap * 10) +
    recencyScore(post?.created_at);

  return { post, score, exactTopicMatch };
}

function filterPostsForSection(posts, section) {
  const allowedAuthorTypes = section?.authorTypes?.length ? new Set(section.authorTypes) : null;

  const ranked = (posts ?? [])
    .filter((post) => {
      if (!post || post.is_hidden) return false;
      if (allowedAuthorTypes && !allowedAuthorTypes.has(post.author_type)) return false;
      return true;
    })
    .map((post) => scorePostForSection(post, section))
    .filter((item) => item.score >= 18 || item.exactTopicMatch)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.post?.created_at ?? 0) - new Date(a.post?.created_at ?? 0);
    });

  return ranked.map((item) => item.post);
}

export const discoverService = {
  /**
   * Publications for a Discover section, using the existing topics system first,
   * then broadening to recent content when the topic match is too sparse.
   */
  getSectionPosts: async (sectionId, { limit = 30, offset = 0 } = {}) => {
    const section = getDiscoverSectionById(sectionId);
    if (!section?.topicSlug) {
      return { data: [], error: null };
    }

    const [topicResult, recentResult] = await Promise.all([
      postsService.getByTopicSlug({
        topicSlug: section.topicSlug,
        authorTypes: section.authorTypes,
        limit: 30,
        offset: 0,
      }),
      postsService.getFeed({ limit: 80, offset: 0 }),
    ]);

    if (topicResult.error || recentResult.error) {
      const error = topicResult.error ?? recentResult.error;
      return { data: [], error };
    }

    const seen = new Set();
    const candidates = [...(topicResult.data ?? []), ...(recentResult.data ?? [])].filter((post) => {
      if (!post?.id || seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });

    const rankedPosts = filterPostsForSection(candidates, section);
    return {
      data: rankedPosts.slice(offset, offset + limit),
      error: null,
    };
  },
};
