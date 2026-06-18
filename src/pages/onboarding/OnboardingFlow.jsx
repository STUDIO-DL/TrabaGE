import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingScreenOne from '../../components/onboarding/OnboardingScreenOne';
import OnboardingScreenTwo from '../../components/onboarding/OnboardingScreenTwo';
import OnboardingScreenThree from '../../components/onboarding/OnboardingScreenThree';
import { setOnboardingComplete } from '../../context/AuthContext';

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const finish = () => {
    setOnboardingComplete();
    navigate('/login', { replace: true });
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

  if (step === 1) {
    return (
      <OnboardingScreenTwo
        currentStep={1}
        onNext={() => setStep(2)}
        onSkip={finish}
        onBack={() => setStep(0)}
      />
    );
  }

  return (
    <OnboardingScreenThree
      currentStep={2}
      onNext={finish}
      onBack={() => setStep(1)}
    />
  );
}
