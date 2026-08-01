import {
  getTopicDisplayLabel,
  isGeneralTopic,
} from '../../constants/topics';

/**
 * Discrete professional topic labels for posts. Non-interactive in phase 1.
 */
export default function TopicChips({ topics = [], className = '' }) {
  const list = (topics ?? []).filter((topic) => topic?.name || topic?.slug);
  if (!list.length) return null;

  return (
    <div
      className={['mt-space-md flex flex-wrap gap-space-sm', className].filter(Boolean).join(' ')}
      aria-label="Temas de la publicación"
    >
      {list.map((topic) => {
        const general = isGeneralTopic(topic);
        return (
          <span
            key={topic.id ?? topic.slug ?? topic.name}
            className={[
              'inline-flex items-center rounded-radius-md border px-2.5 py-1 text-caption',
              general
                ? 'border-primary-150 bg-primary-50/70 text-primary-700 dark:border-primary-800/50 dark:bg-primary-950/30 dark:text-primary-300'
                : 'border-app-border text-app-muted',
            ].join(' ')}
          >
            {getTopicDisplayLabel(topic)}
          </span>
        );
      })}
    </div>
  );
}
