import { useNavigate } from 'react-router-dom';
import EmptyState from '../common/EmptyState';
import { Newspaper } from '../../constants/icons';
import { ROLES, rolePath } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import {
  EMPTY_CONTENT_SECONDARY,
  EMPTY_CONTENT_TITLE,
} from '../../constants/emptyContent';

export const EMPTY_PUBLICATIONS_TITLE = EMPTY_CONTENT_TITLE;
export const EMPTY_PUBLICATIONS_DESCRIPTION =
  EMPTY_CONTENT_SECONDARY.publications ??
  'Vuelve más tarde — pronto habrá novedades en esta sección.';

export function canUserPublishContent(role) {
  return Boolean(role) && role !== ROLES.ADMIN;
}

/**
 * Empty state for Discover topic sections (becas, eventos, prácticas, etc.).
 * Only used on SUCCESS + zero rows — never for fetch errors.
 */
export default function EmptyPublicationsState({
  icon = Newspaper,
  sectionKey = 'default',
  description,
}) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canPublish = canUserPublishContent(role);
  const publishPath = rolePath(role || ROLES.PERSONAL, '/publish');
  const secondary =
    description ??
    EMPTY_CONTENT_SECONDARY[sectionKey] ??
    EMPTY_CONTENT_SECONDARY.default;

  return (
    <EmptyState
      variant="text"
      icon={icon}
      title={EMPTY_CONTENT_TITLE}
      description={secondary || undefined}
      actionLabel={canPublish ? 'Crear publicación' : undefined}
      onAction={canPublish ? () => navigate(publishPath) : undefined}
    />
  );
}
