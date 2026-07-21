import DiscoverCard from './DiscoverCard';
import { getDiscoverSectionsForRole } from '../../constants/discoverSections';
import { useAuth } from '../../hooks/useAuth';

export default function DiscoverHub() {
  const { role } = useAuth();
  const sections = getDiscoverSectionsForRole(role);

  return (
    <div className="p-space-base">
      <nav aria-label="Explorar oportunidades">
        <ul className="grid grid-cols-2 gap-space-sm">
          {sections.map((section, index) => (
            <li
              key={section.id}
              className="card-enter"
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            >
              <DiscoverCard section={section} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
