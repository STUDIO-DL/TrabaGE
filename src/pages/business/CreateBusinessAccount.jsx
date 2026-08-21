import { Building2, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import PageContainer from '../../components/layout/PageContainer';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { fetchProfileCompletion, getProfileCompletionScore } from '../../services/profileCompletion.service';
import { ACCOUNT_KINDS } from '../../constants/accountKinds';

export default function CreateBusinessAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [completion, setCompletion] = useState(null);

  useEffect(() => {
    if (!user?.id) return undefined;
    let mounted = true;
    fetchProfileCompletion(user.id).then(({ data }) => {
      if (mounted && data) setCompletion(data);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const fallbackCompletion = getProfileCompletionScore('personal', profile);
  const percent = Number(completion?.percent ?? fallbackCompletion.percent) || 0;
  const canCreate = percent >= 50;

  return (
    <PageContainer title="Para empresas" backButton bottomNav>
      <div className="mx-auto max-w-2xl space-y-6 p-space-md lg:p-space-lg">
        <section className="rounded-radius-lg border border-app-border bg-app-card p-space-lg shadow-elevation-1">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-radius-md bg-primary-50 text-primary-600">
              <Building2 className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-title font-bold text-app-text">Crear página de empresa</h1>
              <p className="mt-2 text-body-small leading-relaxed text-app-muted">
                Crea una cuenta Business independiente para representar a tu empresa y publicar ofertas.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-radius-md border border-app-border bg-app-surface p-space-md">
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-small font-semibold text-app-text">Completitud de tu perfil personal</span>
              <span className="text-body-small font-bold text-primary-600">{percent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-radius-circular bg-app-disabled">
              <div className="h-full rounded-radius-circular bg-primary-600 transition-all" style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            <p className="mt-3 text-caption text-app-muted">
              Necesitas al menos un 50%: nombre, Acerca de mí, titular profesional y habilidades cuentan para este progreso.
            </p>
          </div>

          {!canCreate && !profileLoading ? (
            <div className="mt-5 flex items-start gap-3 rounded-radius-md border border-warning-200 bg-warning-50 p-space-md text-sm text-warning-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Completa un poco más tu perfil</p>
                <p className="mt-1">Cuando llegues al 50% podrás crear tu página de empresa.</p>
                <Button type="button" variant="secondary" className="mt-3" onClick={() => navigate('/personal/profile')}>
                  Completar perfil
                </Button>
              </div>
            </div>
          ) : null}

          {canCreate ? (
            <Button
              type="button"
              fullWidth
              className="mt-6"
              onClick={async () => {
                await logout();
                navigate('/register', {
                  state: { accountKind: ACCOUNT_KINDS.BUSINESS, businessCreation: true, from: location.pathname },
                });
              }}
            >
              Crear página de empresa
            </Button>
          ) : null}
        </section>
      </div>
    </PageContainer>
  );
}