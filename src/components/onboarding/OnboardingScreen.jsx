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
  imageClassName = 'h-[clamp(220px,52vw,280px)]',
  showArrow = false,
}) {
  return (
    <div
      className="flex min-h-dvh flex-col bg-white"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {onSkip ? (
        <header className="flex shrink-0 justify-end px-6 pt-5">
          <button
            type="button"
            onClick={onSkip}
            className="text-base font-medium text-[#64748B] transition-colors hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            Saltar
          </button>
        </header>
      ) : (
        <div className="shrink-0 pt-5" aria-hidden />
      )}

      <main className="flex flex-1 flex-col items-center px-6 pb-6 pt-2">
        <img
          src={image}
          alt={imageAlt}
          className={[
            'onboarding-illustration-in w-auto max-w-full object-contain',
            imageClassName,
          ].join(' ')}
          decoding="async"
        />

        <h1 className="onboarding-title-in mt-10 max-w-[20rem] text-center text-[34px] font-extrabold leading-[1.1] tracking-tight">
          {title}
        </h1>

        <div className="onboarding-body-in mt-6 max-w-[85%] text-center text-base leading-[1.7] text-[#64748B]">
          {description}
        </div>
      </main>

      <footer className="shrink-0 px-6 pb-8">
        <OnboardingDots currentStep={currentStep} />
        <div className="flex items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 py-2 pl-0 pr-2 text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              Atrás
            </button>
          ) : (
            <span aria-hidden />
          )}
          <PrimaryButton onClick={onNext} showArrow={showArrow}>
            {nextLabel}
          </PrimaryButton>
        </div>
        {secondaryAction ? <div className="mt-3">{secondaryAction}</div> : null}
      </footer>
    </div>
  );
}
