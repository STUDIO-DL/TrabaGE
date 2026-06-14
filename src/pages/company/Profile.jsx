import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CompanyHeader from '../../components/company/CompanyHeader';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export default function Profile() {
  const { user, logout } = useAuth();
  const { profile, loading } = useProfile();

  return (
    <PageContainer title="Perfil de empresa">
      <div className="p-4">
        {loading ? (
          <Spinner fullscreen />
        ) : (
          <>
            <CompanyHeader profile={profile} isOwn />
            <Link to="/company/verification">
              <Button variant="secondary" fullWidth className="mb-3">
                Verificación de empresa
              </Button>
            </Link>
            <Link to={`/companies/${user?.id}`}>
              <Button variant="ghost" fullWidth className="mb-3">
                Ver perfil público
              </Button>
            </Link>
            <Button variant="danger" fullWidth onClick={logout}>
              Cerrar sesión
            </Button>
          </>
        )}
      </div>
    </PageContainer>
  );
}
