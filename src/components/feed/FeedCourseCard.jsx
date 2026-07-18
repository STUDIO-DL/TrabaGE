import Card from '../ui/Card';
import TimeAgo from '../common/TimeAgo';
import { safeExternalUrl } from '../../utils/safeUrl';

export default function FeedCourseCard({ course }) {
  if (!course) return null;

  const externalUrl = safeExternalUrl(course.url);
  const tags = (course.skills_tags ?? []).filter(Boolean);

  return (
    <Card className="mb-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            {course.category === 'scholarship' ? 'Beca' : 'Formación'}
          </p>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{course.title}</h3>
          {course.provider && <p className="mt-0.5 text-xs text-gray-500">{course.provider}</p>}
        </div>
        <TimeAgo date={course.created_at} className="shrink-0 text-xs text-gray-400" />
      </div>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Ver detalles
        </a>
      )}
    </Card>
  );
}
