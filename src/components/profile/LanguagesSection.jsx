import ProfileSectionCard from './ProfileSectionCard';
import { IconGlobe } from './ProfileIcons';

/** Sidebar-only language management when editing own profile */
export default function LanguagesSection({ items = [], isOwn, onAdd, onEdit, onDelete }) {
  if (!isOwn) return null;

  return (
    <ProfileSectionCard
      icon={IconGlobe}
      title="Idiomas"
      isOwn={isOwn}
      onAdd={onAdd}
      isEmpty={!items.length}
      emptyText="Sin idiomas registrados."
    >
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-2 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.language}</p>
              <p className="text-xs text-gray-500">{item.level || 'Nivel no especificado'}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => onEdit?.(item)} className="text-xs font-medium text-primary-600">
                Editar
              </button>
              <button type="button" onClick={() => onDelete?.(item.id)} className="text-xs font-medium text-red-600">
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </ProfileSectionCard>
  );
}
