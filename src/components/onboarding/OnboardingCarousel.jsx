import { useCallback, useEffect, useRef, useState } from 'react';
import OnboardingSlide from './OnboardingSlide';

const AUTO_ADVANCE_MS = 3500;
const SWIPE_THRESHOLD_PX = 48;

export default function OnboardingCarousel({ slides, onFinish, onSkip }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [timerEpoch, setTimerEpoch] = useState(0);
  const touchStartRef = useRef(null);
  const isDraggingRef = useRef(false);

  const totalSteps = slides.length;
  const isLastStep = step === totalSteps - 1;

  const goToStep = useCallback(
    (nextStep) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, nextStep));
      if (clamped === step) return;
      setDirection(clamped > step ? 'forward' : 'backward');
      setStep(clamped);
      setTimerEpoch((value) => value + 1);
    },
    [step, totalSteps],
  );

  const goNext = useCallback(() => {
    if (isLastStep) return;
    goToStep(step + 1);
  }, [goToStep, isLastStep, step]);

  const goPrev = useCallback(() => {
    goToStep(step - 1);
  }, [goToStep, step]);

  useEffect(() => {
    slides.forEach(({ image }) => {
      const preload = new Image();
      preload.src = image;
    });
  }, [slides]);

  useEffect(() => {
    if (isLastStep) return undefined;

    const timer = window.setTimeout(() => {
      setDirection('forward');
      setStep((current) => current + 1);
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [step, timerEpoch, isLastStep]);

  const handlePointerDown = (clientX, clientY) => {
    touchStartRef.current = { x: clientX, y: clientY };
    isDraggingRef.current = true;
  };

  const handlePointerUp = (clientX, clientY) => {
    if (!isDraggingRef.current || !touchStartRef.current) return;

    const deltaX = clientX - touchStartRef.current.x;
    const deltaY = clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    isDraggingRef.current = false;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0) {
      goNext();
      return;
    }

    goPrev();
  };

  const slide = slides[step];

  const swipeHandlers = {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    },
    onTouchEnd: (event) => {
      const touch = event.changedTouches[0];
      handlePointerUp(touch.clientX, touch.clientY);
    },
    onMouseDown: (event) => {
      if (event.button !== 0) return;
      handlePointerDown(event.clientX, event.clientY);
    },
    onMouseUp: (event) => {
      if (event.button !== 0) return;
      handlePointerUp(event.clientX, event.clientY);
    },
    onMouseLeave: () => {
      touchStartRef.current = null;
      isDraggingRef.current = false;
    },
  };

  return (
    <div className="onboarding-screen relative flex min-h-dvh flex-col overflow-hidden">
      {onSkip ? (
        <button type="button" onClick={onSkip} className="onboarding-skip-btn">
          Saltar
        </button>
      ) : null}
      <OnboardingSlide
        key={step}
        image={slide.image}
        imageAlt={slide.imageAlt}
        imageClassName={slide.imageClassName}
        title={slide.title}
        description={slide.description}
        direction={direction}
        currentStep={step}
        totalSteps={totalSteps}
        onSelectStep={goToStep}
        onFinish={isLastStep ? onFinish : undefined}
        isLastStep={isLastStep}
        swipeHandlers={swipeHandlers}
      />
    </div>
  );
}
