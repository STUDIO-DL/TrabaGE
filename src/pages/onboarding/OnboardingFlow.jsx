import { Navigate, useNavigate } from 'react-router-dom';
import OnboardingCarousel from '../../components/onboarding/OnboardingCarousel';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import { getOnboardingComplete, setOnboardingComplete } from '../../context/AuthContext';
import { useAuth } from '../../hooks/useAuth';

const SLIDES = [
  {
    image: '/images/onboarding-map.png',
    imageAlt: 'Mapa de Guinea Ecuatorial con ubicaciones conectadas por TrabaGE',
    title: 'Explora oportunidades en todo el país',
    description: 'Conectando oportunidades en todo el ámbito nacional.',
  },
  {
    image: '/images/onboarding-network.png',
    imageAlt: 'Red de profesionales de diferentes sectores conectados por TrabaGE',
    imageClassName: 'onboarding-hero-image--portrait',
    title: 'Conecta con personas y empresas',
    description: 'Amplía tu red profesional y descubre nuevas oportunidades.',
  },
  {
    image: '/images/onboarding-opportunities.png',
    imageAlt: 'Candidato descubriendo oportunidades laborales en TrabaGE',
    imageClassName: 'onboarding-hero-image--portrait',
    title: 'Encuentra tu próximo empleo',
    description: 'Descubre nuevas ofertas de empleo al instante.',
  },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { isAuthenticated, role, getHomePath, loading, isPreviewMode } = useAuth();

  if (loading && !isPreviewMode) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && !isPreviewMode && role) {
    const home = getHomePath();
    if (home) return <Navigate to={home} replace />;
  }

  if (getOnboardingComplete()) {
    return <Navigate to="/login" replace />;
  }

  const finish = () => {
    setOnboardingComplete();
    navigate('/login', { replace: true });
  };

  return <OnboardingCarousel slides={SLIDES} onFinish={finish} onSkip={finish} />;
}
