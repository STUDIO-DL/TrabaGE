import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import { rolePath } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

export default function DiscoverCard({ section }) {
  const { role } = useAuth();
  const to = rolePath(role, section.pathSuffix);

  return (
    <Link
      to={to}
      className="group block min-h-touch rounded-radius-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <Card
        elevation={1}
        className="flex h-full min-h-[5.5rem] items-center p-space-md transition-all duration-fast ease-out group-hover:border-app-muted/40 group-hover:bg-app-surface group-active:scale-[0.98] group-active:bg-app-surface"
      >
        <h3 className="text-body-small font-semibold text-app-text text-user-content">
          {section.title}
        </h3>
      </Card>
    </Link>
  );
}
