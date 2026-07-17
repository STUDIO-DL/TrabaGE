import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingSlide from '../../components/onboarding/OnboardingSlide';
import { setOnboardingComplete } from '../../context/AuthContext';

const SLIDE_DURATION_MS = 4000;

const SLIDES = [
  {
    image: '/images/onboarding-map.png',
    imageAlt: 'Mapa de Guinea Ecuatorial con ubicaciones conectadas por TrabaGE',
  },
  {
    image: '/images/onboarding-network.png',
    imageAlt: 'Red de profesionales de diferentes sectores conectados por TrabaGE',
    imageClassName: 'onboarding-hero-image--portrait',
  },
  {
    image: '/images/onboarding-opportunities.png',
    imageAlt: 'Joven profesional descubriendo oportunidades laborales en TrabaGE',
    imageClassName: 'onboarding-hero-image--portrait',
  },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    SLIDES.forEach(({ image }) => {
      const preload = new Image();
      preload.src = image;
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStep((current) => (current + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [step]);

  const finish = () => {
    setOnboardingComplete();
    navigate('/login', { replace: true });
  };

  return (
    <OnboardingSlide
      key={SLIDES[step].image}
      image={SLIDES[step].image}
      imageAlt={SLIDES[step].imageAlt}
      imageClassName={SLIDES[step].imageClassName}
      currentStep={step}
      totalSteps={SLIDES.length}
      onSelectStep={setStep}
      onNext={finish}
      nextLabel="Comenzar"
      showNextArrow={false}
    />
  );
}
