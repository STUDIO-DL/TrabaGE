import Card from '../ui/Card';
import TimeAgo from '../common/TimeAgo';

export default function FeedNewsCard({ article }) {
  if (!article) return null;

  const externalUrl = article.url?.startsWith('http') ? article.url : null;

  return (
    <Card className="mb-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary-600">Noticia</p>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{article.title}</h3>
          {article.source && <p className="mt-0.5 text-xs text-gray-500">{article.source}</p>}
        </div>
        <TimeAgo
          date={article.published_at}
          className="shrink-0 text-xs text-gray-400"
        />
      </div>
      {article.summary && <p className="text-sm text-gray-700">{article.summary}</p>}
      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Leer más
        </a>
      )}
    </Card>
  );
}
