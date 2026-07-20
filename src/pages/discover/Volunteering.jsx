import { useNavigate } from 'react-router-dom';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import { Users } from '../../constants/icons';
import { rolePath } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

export default function Volunteering() {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <DiscoverSectionPage
      title="Voluntariado"
      loading={false}
      isEmpty
      emptyIcon={Users}
      emptyTitle="Voluntariado próximamente"
      emptyDescription="Estamos preparando oportunidades de voluntariado y proyectos sociales. Mientras tanto, explora otras secciones de Descubrir."
      emptyActionLabel="Volver a Descubrir"
      onEmptyAction={() => navigate(`${rolePath(role, '/feed')}?tab=discover`)}
    />
  );
}
