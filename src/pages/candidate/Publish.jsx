import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import PostComposer from '../../components/feed/PostComposer';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import AppIcon from '../../components/common/AppIcon';
import { Briefcase, FileText, ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { useCreatePost } from '../../hooks/useCreatePost';
import { useProfile } from '../../hooks/useProfile';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { isSharedOpportunityProfileComplete } from '../../utils/profileRequirements';

const PROFILE_REQUIRED_MESSAGE =
  'Para publicar oportunidades de empleo primero debes completar tu perfil. Esto ayuda a generar confianza y mejora la calidad de las publicaciones.';

export default function Publish() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPreviewMode } = useAuth();
  const { createPost, loading, uploadPhase } = useCreatePost();
  const { profile, loading: profileLoading } = useProfile();
  const [showProfileGate, setShowProfileGate] = useState(false);
  const mode = useMemo(() => new URLSearchParams(location.search).get('mode'), [location.search]);

  const closePublishFlow = () => {
    if (location.key === 'default') {
      navigate('/personal/feed', { replace: true });
      return;
    }
    navigate(-1);
  };

  const openPostComposer = () => {
    setShowProfileGate(false);
    navigate('/personal/publish?mode=post');
  };

  const openSharedOpportunity = () => {
    if (profileLoading) return;
    if (!isSharedOpportunityProfileComplete(profile)) {
      setShowProfileGate(true);
      return;
    }
    navigate('/personal/opportunities/create');
  };

  if (isPreviewMode) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="bg-app-bg">
        <div className="p-4">
          <div className="rounded-radius-md border border-primary-100 bg-primary-50 p-6 text-center">
            <p className="text-sm text-primary-900">{GUEST_MODE_MESSAGE}</p>
            <Button className="mt-4" onClick={() => navigate('/login')}>
              Iniciar sesión
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (mode === 'post') {
    return (
      <PageContainer topBar={false} bottomNav={false} className="bg-app-bg">
        <PostComposer
          onSubmit={createPost}
          loading={loading}
          uploadPhase={uploadPhase}
          onClose={closePublishFlow}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false} className="bg-app-bg">
      <BottomSheet
        isOpen
        onClose={closePublishFlow}
        title={showProfileGate ? 'Completa tu perfil' : 'Publicar'}
      >
        {showProfileGate ? (
          <div className="space-y-space-md">
            <p className="text-body-small leading-relaxed text-app-muted">
              {PROFILE_REQUIRED_MESSAGE}
            </p>
            <div className="flex flex-col gap-space-sm">
              <Button fullWidth onClick={() => navigate('/personal/profile/edit-intro')}>
                Completar perfil
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setShowProfileGate(false)}>
                Volver
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-space-sm">
            <button
              type="button"
              onClick={openPostComposer}
              className="flex w-full items-start gap-space-md rounded-radius-md border border-app-border bg-app-card p-space-base text-left transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span className="flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm bg-app-surface text-primary-600">
                <AppIcon icon={FileText} size={ICON_SIZES.lg} />
              </span>
              <span className="min-w-0">
                <span className="block text-body font-semibold text-app-text">Crear publicación</span>
                <span className="mt-space-xs block text-body-small leading-relaxed text-app-muted">
                  Comparte una actualización, una imagen, una idea o cualquier contenido con la comunidad.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={openSharedOpportunity}
              disabled={profileLoading}
              className="flex w-full items-start gap-space-md rounded-radius-md border border-app-border bg-app-card p-space-base text-left transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm bg-app-surface text-primary-600">
                <AppIcon icon={Briefcase} size={ICON_SIZES.lg} />
              </span>
              <span className="min-w-0">
                <span className="block text-body font-semibold text-app-text">
                  Publicar oportunidad de empleo
                </span>
                <span className="mt-space-xs block text-body-small leading-relaxed text-app-muted">
                  Comparte una oportunidad laboral para ayudar a otras personas a encontrar trabajo.
                </span>
              </span>
            </button>
          </div>
        )}
      </BottomSheet>
    </PageContainer>
  );
}
