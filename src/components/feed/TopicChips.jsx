/**
 * Discrete professional topic labels for posts. Non-interactive in phase 1.
 */
export default function TopicChips({ topics = [], className = '' }) {
  const list = (topics ?? []).filter((topic) => topic?.name);
  if (!list.length) return null;

  return (
    <div
      className={['mt-space-md flex flex-wrap gap-space-sm', className].filter(Boolean).join(' ')}
      aria-label="Temas de la publicación"
    >
      {list.map((topic) => (
        <span
          key={topic.id ?? topic.slug ?? topic.name}
          className="inline-flex items-center rounded-radius-md border border-app-border px-2.5 py-1 text-caption text-app-muted"
        >
          {topic.name}
        </span>
      ))}
    </div>
  );
}
