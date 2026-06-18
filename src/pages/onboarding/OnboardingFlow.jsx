import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingScreenOne from '../../components/onboarding/OnboardingScreenOne';
import OnboardingSlide from '../../components/onboarding/OnboardingSlide';
import Button from '../../components/ui/Button';
import { setOnboardingComplete } from '../../context/AuthContext';
import { useAuth } from '../../hooks/useAuth';

const SLIDES = [
  {
    title: (
      <>
        <span className="block text-[#111827]">Conecta con empresas</span>
        <span className="block text-[#2563EB]">verificadas.</span>
      </>
    ),
    description: (
      <p>
        Sigue empresas de confianza y mantente al día con el feed profesional de Guinea Ecuatorial.
      </p>
    ),
  },
  {
    title: (
      <>
        <span className="block text-[#111827]">Aplica en minutos.</span>
        <span className="block text-[#2563EB]">Empieza hoy.</span>
      </>
    ),
    description: (
      <p>Sube tu CV una vez y postula a múltiples empleos de forma sencilla y rápida.</p>
    ),
  },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { enterPreviewMode } = useAuth();
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length;

  const finish = () => {
    setOnboardingComplete();
    navigate('/login', { replace: true });
  };

  const handlePreview = () => {
    setOnboardingComplete();
    enterPreviewMode();
    navigate('/account-type', { replace: true });
  };

  const handleNext = () => {
    if (isLast) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  if (step === 0) {
    return (
      <OnboardingScreenOne
        currentStep={0}
        onNext={() => setStep(1)}
        onSkip={finish}
      />
    );
  }

  const slide = SLIDES[step - 1];

  return (
    <OnboardingSlide
      key={step}
      title={slide.title}
      description={slide.description}
      currentStep={step}
      totalSteps={SLIDES.length + 1}
      onNext={handleNext}
      onSkip={finish}
      nextLabel={isLast ? 'Comenzar' : 'Siguiente'}
      secondaryAction={
        isLast ? (
          <Button variant="secondary" fullWidth onClick={handlePreview} className="!h-14 !rounded-2xl">
            Explorar sin cuenta
          </Button>
        ) : null
      }
    />
  );
}
