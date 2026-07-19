import { memo, useCallback, useId, useLayoutEffect, useRef, useState } from 'react';

const COLLAPSED_LINES = 3;
const LINE_CLAMP_CLASS = 'line-clamp-3';

function ExpandableText({ text, className = '', defaultExpanded = false }) {
  const trimmed = text?.trim?.() ?? '';
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const [fullHeight, setFullHeight] = useState(0);
  const measureRef = useRef(null);
  const contentId = useId();

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !trimmed) {
      setNeedsTruncation(false);
      setCollapsedHeight(0);
      setFullHeight(0);
      return;
    }

    const styles = getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const full = el.scrollHeight;
    const collapsed = Math.ceil(lineHeight * COLLAPSED_LINES);

    setFullHeight(full);
    setCollapsedHeight(Math.min(full, collapsed));
    setNeedsTruncation(full > collapsed + 1);
  }, [trimmed]);

  const toggle = useCallback(() => setExpanded((value) => !value), []);

  if (!trimmed) return null;

  const isAnimating = needsTruncation;
  const maxHeight = expanded ? fullHeight : collapsedHeight;

  return (
    <div className={`relative ${className}`.trim()}>
      <p
        ref={measureRef}
        className="pointer-events-none absolute left-0 top-0 -z-10 w-full opacity-0 whitespace-pre-wrap text-body-small"
        aria-hidden
      >
        {trimmed}
      </p>

      <div
        className={
          isAnimating
            ? 'overflow-hidden transition-[max-height] duration-300 ease-in-out motion-reduce:transition-none'
            : undefined
        }
        style={isAnimating ? { maxHeight: `${maxHeight}px` } : undefined}
      >
        <p
          id={contentId}
          className={`whitespace-pre-wrap text-body-small text-app-text ${
            needsTruncation && !expanded ? LINE_CLAMP_CLASS : ''
          }`}
        >
          {trimmed}
        </p>
      </div>

      {needsTruncation && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={contentId}
          className="mt-space-xs text-body-small font-semibold text-app-muted transition-colors duration-fast hover:text-primary-600"
        >
          {expanded ? 'Mostrar menos' : 'Leer más'}
        </button>
      )}
    </div>
  );
}

export default memo(ExpandableText);
