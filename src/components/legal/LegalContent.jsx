function LegalBlock({ block }) {
  if (block.type === 'ul') {
    return (
      <ul className="my-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'link') {
    return (
      <p className="my-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
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

  const text = block.text ?? '';
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);

  if (urlMatch) {
    const [url] = urlMatch;
    const [before, after] = text.split(url);
    return (
      <p className="my-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
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
      </p>
    );
  }

  return (
    <p className="my-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{text}</p>
  );
}

export function LegalArticle({ article }) {
  return (
    <section id={article.id} className="scroll-mt-24 border-b border-slate-100 py-8 last:border-b-0 dark:border-slate-800">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {article.title}
      </h2>
      <div className="mt-4">
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
        Índice
      </p>
      <ol className="max-h-48 space-y-1 overflow-y-auto pr-1 text-sm sm:max-h-none">
        {allArticles.map((article) => (
          <li key={article.id}>
            <a
              href={`#${article.id}`}
              className="block rounded-lg px-2 py-1.5 text-slate-600 transition hover:bg-white hover:text-primary-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-primary-400"
            >
              {article.title.replace(/^Artículo \d+\.\s*/, '')}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
