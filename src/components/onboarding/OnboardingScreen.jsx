import MobileScreenLayout from '../layout/MobileScreenLayout';
import OnboardingDots from './OnboardingDots';
import PrimaryButton from './PrimaryButton';

export default function OnboardingScreen({
  icon: Icon,
  iconLabel,
  title,
  description,
  buttonText,
  currentStep,
  onNext,
  onSkip,
}) {
  return (
    <MobileScreenLayout
      noScroll
      header={
        onSkip ? (
          <div className="flex justify-end px-md pt-sm">
            <button
              type="button"
              onClick={onSkip}
              className="text-small font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              Saltar
            </button>
          </div>
        ) : (
          <div className="pt-sm" aria-hidden />
        )
      }
      contentClassName="items-center justify-between px-md pb-sm pt-xs"
      footer={
        <>
          <OnboardingDots currentStep={currentStep} />
          <PrimaryButton onClick={onNext} showArrow className="mt-sm w-full">
            {buttonText}
          </PrimaryButton>
        </>
      }
      footerClassName="w-full max-w-md px-md pb-md"
    >
      <div
        className="onboarding-illustration-in flex h-52 w-52 items-center justify-center rounded-full bg-gradient-to-br from-primary-50 via-white to-primary-100 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
        aria-label={iconLabel}
      >
        {Icon && <Icon className="h-24 w-24 text-primary-600" strokeWidth={1.5} />}
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
        <h1 className="onboarding-title-in max-w-[22rem] text-center text-heading-l font-extrabold leading-[1.1] tracking-tight sm:text-heading-xl">
          {title}
        </h1>

        <div className="onboarding-body-in mt-sm max-w-[90%] min-h-0 text-center text-caption leading-snug text-slate-600 sm:mt-md sm:text-small sm:leading-relaxed">
          {description}
        </div>
      </div>
    </MobileScreenLayout>
  );
}
