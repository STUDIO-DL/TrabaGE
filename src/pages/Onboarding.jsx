import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import OnboardingScreenOne from '../components/onboarding/OnboardingScreenOne';
import OnboardingScreenTwo from '../components/onboarding/OnboardingScreenTwo';
import OnboardingScreenThree from '../components/onboarding/OnboardingScreenThree';
import { setOnboardingComplete } from '../context/AuthContext';

const SCREENS = [OnboardingScreenOne, OnboardingScreenTwo, OnboardingScreenThree];

const variants = {
  enter: {
    x: '100%',
    opacity: 0,
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: {
    zIndex: 0,
    x: '-100%',
    opacity: 0,
  },
};

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < SCREENS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleStart = () => {
    setOnboardingComplete();
    navigate('/login', { replace: true });
  };

  const handleSkip = () => {
    setOnboardingComplete();
    navigate('/login', { replace: true });
  };

  const CurrentScreen = SCREENS[currentStep];
  const isLastStep = currentStep === SCREENS.length - 1;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={currentStep}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute h-full w-full"
        >
          <CurrentScreen currentStep={currentStep} onNext={isLastStep ? handleStart : handleNext} onSkip={handleSkip} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}