function renderTextWithLinks(text) {
  if (!text) return null;

  // Markdown-style links: [label](https://...)
  const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mdRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'link', label: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (parts.length > 0) {
    if (lastIndex < text.length) {
      parts.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return parts.map((part, index) => {
      if (part.type === 'link') {
        return (
          <a
            key={`md-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 underline decoration-primary-200 underline-offset-2 transition hover:text-primary-700"
          >
            {part.label}
          </a>
        );
      }
      return <span key={`t-${index}`}>{part.value}</span>;
    });
  }

  // Bare URL fallback
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) {
    const [url] = urlMatch;
    const [before, after] = text.split(url);
    return (
      <>
        {before}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-primary-600 underline decoration-primary-200 underline-offset-2 transition hover:text-primary-700"
        >
          {url}
        </a>
        {after}
      </>
    );
  }

  return text;
}

function LegalBlock({ block }) {
  if (block.type === 'ul') {
    return (
      <ul className="my-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
        {block.items.map((item) => (
          <li key={item}>{renderTextWithLinks(item)}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'link') {
    return (
      <p className="my-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
        <a
          href={block.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary-600 underline decoration-primary-200 underline-offset-2 transition hover:text-primary-700"
        >
          {block.text}
        </a>
      </p>
    );
  }

  return (
    <p className="my-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
      {renderTextWithLinks(block.text ?? '')}
    </p>
  );
}

export function LegalArticle({ article }) {
  return (
    <section id={article.id} className="scroll-mt-24 border-b border-slate-100 py-5 last:border-b-0 dark:border-slate-800">
      <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {article.title}
      </h2>
      <div className="mt-2">
        {article.blocks.map((block, index) => (
          <LegalBlock key={`${article.id}-${index}`} block={block} />
        ))}
      </div>
    </section>
  );
}

export function LegalTableOfContents({ articles, finalArticles = [] }) {
  const allArticles = [...articles, ...finalArticles];

  return (
    <nav
      aria-label="Índice del documento"
      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Contenido
      </p>
      <ol className="max-h-48 space-y-0.5 overflow-y-auto pr-1 text-[13px] sm:max-h-none">
        {allArticles.map((article) => (
          <li key={article.id}>
            <a
              href={`#${article.id}`}
              className="block rounded-lg px-2 py-1 text-slate-600 transition hover:bg-white hover:text-primary-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-primary-400"
            >
              {article.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
