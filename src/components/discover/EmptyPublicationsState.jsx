import { useNavigate } from 'react-router-dom';
import EmptyState from '../common/EmptyState';
import { Newspaper } from '../../constants/icons';
import { ROLES, rolePath } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

export const EMPTY_PUBLICATIONS_TITLE = 'Aún no hay publicaciones aquí';
export const EMPTY_PUBLICATIONS_DESCRIPTION =
  'Todavía nadie ha compartido contenido sobre este tema. Vuelve más tarde o sé el primero en publicar.';

export function canUserPublishContent(role) {
  return Boolean(role) && role !== ROLES.ADMIN;
}

export default function EmptyPublicationsState({ icon = Newspaper }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canPublish = canUserPublishContent(role);
  const publishPath = rolePath(role || ROLES.PERSONAL, '/publish');

  return (
    <EmptyState
      variant="soft"
      icon={icon}
      title={EMPTY_PUBLICATIONS_TITLE}
      description={EMPTY_PUBLICATIONS_DESCRIPTION}
      actionLabel={canPublish ? 'Crear publicación' : undefined}
      onAction={canPublish ? () => navigate(publishPath) : undefined}
    />
  );
}
