import TimeAgo from '../common/TimeAgo';
import { safeExternalUrl } from '../../utils/safeUrl';

export default function FeedNewsCard({ article }) {
  if (!article) return null;

  const externalUrl = safeExternalUrl(article.url);

  return (
    <article className="surface-flat border-b border-app-divider py-space-base last:border-b-0 sm:py-space-lg">
      <div className="mb-space-sm flex items-start justify-between gap-space-sm">
        <div className="min-w-0">
          <p className="text-caption font-medium text-app-subtle">Noticia</p>
          <h3 className="mt-space-xs text-user-content text-body font-semibold text-app-text">
            {article.title}
          </h3>
          {article.source ? (
            <p className="mt-space-xs text-caption text-app-muted">{article.source}</p>
          ) : null}
        </div>
        <TimeAgo date={article.published_at} className="shrink-0 text-caption text-app-subtle" />
      </div>
      {article.summary ? (
        <p className="text-body-small text-app-muted">{article.summary}</p>
      ) : null}
      {externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-space-sm inline-block text-body-small font-medium text-primary-600 hover:text-primary-700"
        >
          Leer más
        </a>
      ) : null}
    </article>
  );
}
