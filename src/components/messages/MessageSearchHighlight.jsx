import { splitSearchHighlight } from '../../utils/messageSearch';

/** Subtle in-text highlight for search snippets. */
export default function MessageSearchHighlight({ text, query, className = '' }) {
  const parts = splitSearchHighlight(text, query);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={`${index}-${part.text.slice(0, 8)}`}
            className="rounded-sm bg-primary-100 px-0.5 text-app-text dark:bg-primary-900/50"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${index}-${part.text.slice(0, 8)}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}
