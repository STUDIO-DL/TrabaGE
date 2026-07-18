import { useNavigate } from 'react-router-dom';
import OnboardingCarousel from '../../components/onboarding/OnboardingCarousel';
import { setOnboardingComplete } from '../../context/AuthContext';

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

  const finish = () => {
    setOnboardingComplete();
    navigate('/login', { replace: true });
  };

  return <OnboardingCarousel slides={SLIDES} onFinish={finish} onSkip={finish} />;
}
