import { ChevronRight } from 'lucide-react';

export default function OnboardingSlide({
  image,
  imageAlt = '',
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  nextLabel = 'Siguiente',
  secondaryAction = null,
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <section
        className="relative w-full shrink-0"
        style={{ height: 'clamp(17.5rem, 47dvh, 25.5rem)' }}
      >
        <button
          type="button"
          onClick={onSkip}
          className="absolute z-20 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#374151] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          style={{
            top: 'max(0.875rem, env(safe-area-inset-top))',
            right: 'max(1.25rem, env(safe-area-inset-right))',
          }}
        >
          Saltar
        </button>

        {image ? (
          <div className="onboarding-hero-in onboarding-hero-shell relative h-full w-full bg-white">
            <img
              src={image}
              alt={imageAlt}
              className="onboarding-hero-image"
              decoding="async"
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[22%] bg-gradient-to-b from-white via-white/85 to-transparent"
              aria-hidden
            />
          </div>
        ) : (
          <div className="h-8" aria-hidden />
        )}
      </section>

      <div className="flex min-h-0 flex-1 flex-col px-5 pt-6">
        <div className="mx-auto w-[90%] text-center">
          <h1 className="onboarding-title-in text-[2rem] font-bold leading-[1.12] tracking-tight sm:text-[2.125rem]">
            {title}
          </h1>

          <div className="onboarding-desc-in mt-5 space-y-4 text-[0.9375rem] leading-[1.65] text-[#6B7280] sm:text-base">
            {description}
          </div>
        </div>

        <div
          className="mt-auto w-full pt-7"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mb-6 flex justify-center gap-2.5" role="tablist" aria-label="Progreso del onboarding">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                role="tab"
                aria-selected={i === currentStep}
                aria-label={`Paso ${i + 1} de ${totalSteps}`}
                className={[
                  'rounded-radius-circular transition-colors duration-normal ease-out',
                  i === currentStep ? 'h-2.5 w-2.5 bg-primary-600' : 'h-2 w-2 bg-app-border',
                ].join(' ')}
              />
            ))}
          </div>

          <div className="mx-auto flex w-[90%] flex-col gap-space-md">
            <button
              type="button"
              onClick={onNext}
              className="relative inline-flex h-btn-primary w-full items-center justify-center rounded-radius-lg bg-primary-600 px-space-xl text-body font-semibold text-white shadow-elevation-3 transition-colors duration-fast ease-out hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              {nextLabel}
              <ChevronRight className="absolute right-5 h-5 w-5" aria-hidden />
            </button>
            {secondaryAction}
          </div>
        </div>
      </div>
    </div>
  );
}
