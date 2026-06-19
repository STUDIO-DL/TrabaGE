import MobileScreenLayout from '../layout/MobileScreenLayout';
import OnboardingDots from './OnboardingDots';
import PrimaryButton from './PrimaryButton';

export default function OnboardingScreen({
  image,
  imageAlt,
  title,
  description,
  currentStep,
  onNext,
  onSkip,
  onBack,
  nextLabel = 'Siguiente',
  secondaryAction = null,
  imageClassName = 'onboarding-illustration-max',
  showArrow = false,
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
              className="text-small font-medium text-[#64748B] transition-colors hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
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
          <div className="mt-sm flex items-center justify-between gap-sm">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 py-xs pr-sm text-small font-medium text-[#64748B] transition-colors hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                Atrás
              </button>
            ) : (
              <span aria-hidden />
            )}
            <PrimaryButton onClick={onNext} showArrow={showArrow} className="min-w-[9rem] flex-1">
              {nextLabel}
            </PrimaryButton>
          </div>
          {secondaryAction ? <div className="mt-sm">{secondaryAction}</div> : null}
        </>
      }
      footerClassName="pb-md"
    >
      <img
        src={image}
        alt={imageAlt}
        className={['onboarding-illustration-in w-auto max-w-full shrink-0 object-contain', imageClassName].join(
          ' ',
        )}
        decoding="async"
      />

      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
        <h1 className="onboarding-title-in max-w-[20rem] text-center text-heading-l font-extrabold leading-[1.1] tracking-tight sm:text-heading-xl">
          {title}
        </h1>

        <div className="onboarding-body-in mt-sm max-w-[90%] min-h-0 text-center text-caption leading-snug text-[#64748B] sm:mt-md sm:text-small sm:leading-relaxed">
          {description}
        </div>
      </div>
    </MobileScreenLayout>
  );
}
