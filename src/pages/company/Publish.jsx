import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import PostComposer from '../../components/feed/PostComposer';
import AppIcon from '../../components/common/AppIcon';
import { Briefcase, FileText, ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { useCreatePost } from '../../hooks/useCreatePost';
import { ROLES, rolePath } from '../../constants/roles';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

const PUBLISH_MODES = {
  SELECT: 'select',
  POST: 'post',
};

const PUBLISH_OPTIONS = [
  {
    id: 'post',
    label: 'Publicación',
    description: 'Comparte novedades, cultura o actualizaciones con tu comunidad.',
    icon: FileText,
    tone: 'text-violet-600 bg-violet-50',
  },
  {
    id: 'job',
    label: 'Oferta de empleo',
    description: 'Publica una vacante y recibe postulaciones de candidatos.',
    icon: Briefcase,
    tone: 'text-blue-600 bg-blue-50',
  },
];

export default function Publish() {
  const { isPreviewMode, role } = useAuth();
  const navigate = useNavigate();
  const { createPost, loading } = useCreatePost();
  const [mode, setMode] = useState(PUBLISH_MODES.SELECT);
  const base = role || ROLES.BUSINESS;

  const handleCreatePost = async (payload) => {
    const result = await createPost(payload);
    if (result.ok) setMode(PUBLISH_MODES.SELECT);
  };

  const handleOptionSelect = (optionId) => {
    if (optionId === 'post') {
      setMode(PUBLISH_MODES.POST);
      return;
    }
    navigate(rolePath(base, '/jobs/create'));
  };

  if (isPreviewMode) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="!pb-0 bg-white">
        <div className="p-4">
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-6 text-center">
            <p className="text-sm text-primary-900">{GUEST_MODE_MESSAGE}</p>
            <Link
              to="/login"
              className="mt-4 inline-block rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (mode === PUBLISH_MODES.POST) {
    return (
      <PageContainer topBar={false} bottomNav={false} className="!pb-0 bg-white">
        <PostComposer
          onSubmit={handleCreatePost}
          loading={loading}
          onClose={() => setMode(PUBLISH_MODES.SELECT)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false}>
      <div className="p-4">
        <p className="mb-4 text-sm text-gray-600">¿Qué quieres publicar?</p>
        <div className="grid grid-cols-1 gap-3">
          {PUBLISH_OPTIONS.map(({ id, label, description, icon: Icon, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleOptionSelect(id)}
              className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-primary-100 hover:bg-primary-50/40"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <AppIcon icon={Icon} size={ICON_SIZES.default} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-500">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
