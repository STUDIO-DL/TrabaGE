import TimeAgo from '../common/TimeAgo';
import { safeExternalUrl } from '../../utils/safeUrl';

export default function FeedCourseCard({ course }) {
  if (!course) return null;

  const externalUrl = safeExternalUrl(course.url);
  const tags = (course.skills_tags ?? []).filter(Boolean);

  return (
    <article className="surface-flat border-b border-app-divider py-space-base last:border-b-0 sm:py-space-lg">
      <div className="mb-space-sm flex items-start justify-between gap-space-sm">
        <div className="min-w-0">
          <p className="text-caption font-medium text-app-subtle">
            {course.category === 'scholarship' ? 'Beca' : 'Formación'}
          </p>
          <h3 className="mt-space-xs text-user-content text-body font-semibold text-app-text">
            {course.title}
          </h3>
          {course.provider ? (
            <p className="mt-space-xs text-caption text-app-muted">{course.provider}</p>
          ) : null}
        </div>
        <TimeAgo date={course.created_at} className="shrink-0 text-caption text-app-subtle" />
      </div>
      {tags.length > 0 ? (
        <div className="mt-space-sm flex flex-wrap gap-space-xs">
          {tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-radius-sm bg-app-surface px-space-sm py-0.5 text-caption text-app-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-space-sm inline-block text-body-small font-medium text-primary-600 hover:text-primary-700"
        >
          Ver detalles
        </a>
      ) : null}
    </article>
  );
}
