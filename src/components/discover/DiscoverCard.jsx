import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { rolePath } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

export default function DiscoverCard({ section }) {
  const { role } = useAuth();
  const to = rolePath(role, section.pathSuffix);
  const isPeople = section.kind === 'people' || Boolean(section.description);

  if (isPeople) {
    return (
      <Link
        to={to}
        className="group block min-h-touch rounded-radius-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Card
          elevation={1}
          className="flex h-full flex-col justify-between gap-space-sm p-space-md transition-all duration-fast ease-out group-hover:border-primary-200 group-hover:bg-primary-50/40 group-active:scale-[0.98] group-active:bg-primary-50/50"
        >
          <div>
            <h3 className="text-body-small font-semibold text-app-text text-user-content">
              Descubrir personas
            </h3>
            {section.description ? (
              <p className="mt-1 text-caption leading-relaxed text-app-subtle text-user-content">
                {section.description}
              </p>
            ) : null}
          </div>
          <span className="inline-flex">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="pointer-events-none !min-h-0"
              tabIndex={-1}
              aria-hidden="true"
            >
              {section.ctaLabel || 'Ver personas'}
            </Button>
          </span>
        </Card>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className="group block min-h-touch rounded-radius-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <Card
        elevation={1}
        className="flex h-full min-h-[5.5rem] items-center p-space-md transition-all duration-fast ease-out group-hover:border-primary-200 group-hover:bg-primary-50/40 group-active:scale-[0.98] group-active:bg-primary-50/50"
      >
        <h3 className="text-body-small font-semibold text-app-text text-user-content">
          {section.title}
        </h3>
      </Card>
    </Link>
  );
}
