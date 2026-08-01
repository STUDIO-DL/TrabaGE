/**
 * Special post topic: general audience ("Todos").
 * Expands feed eligibility; does not force top ranking.
 */
export const GENERAL_TOPIC_SLUG = 'todos';
export const GENERAL_TOPIC_NAME = 'Todos';
export const GENERAL_TOPIC_BADGE_LABEL = '🌍 Para todos';
export const GENERAL_TOPIC_SELECTOR_LABEL = '🌍 Todos';

/** Modest ranking boost — enough to pass feed thresholds, below follow/sector. */
export const GENERAL_TOPIC_FEED_BOOST = 10;

export function isGeneralTopic(topic) {
  if (!topic) return false;
  const slug = String(topic.slug ?? '').trim().toLowerCase();
  if (slug === GENERAL_TOPIC_SLUG) return true;
  return String(topic.name ?? '').trim().toLowerCase() === 'todos';
}

export function postHasGeneralTopic(post) {
  return (post?.topics ?? []).some(isGeneralTopic);
}

/** Put "Todos" first; keep alphabetical order for the rest. */
export function sortTopicsForSelector(topics = []) {
  return [...(topics ?? [])].sort((a, b) => {
    const aGeneral = isGeneralTopic(a);
    const bGeneral = isGeneralTopic(b);
    if (aGeneral && !bGeneral) return -1;
    if (!aGeneral && bGeneral) return 1;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', {
      sensitivity: 'base',
    });
  });
}

export function getTopicDisplayLabel(topic, { forSelector = false } = {}) {
  if (isGeneralTopic(topic)) {
    return forSelector ? GENERAL_TOPIC_SELECTOR_LABEL : GENERAL_TOPIC_BADGE_LABEL;
  }
  return topic?.name ?? '';
}
