import { ChevronRight } from 'lucide-react';

export default function OnboardingSlide({
  image,
  imageAlt = '',
  title,
  description,
  currentStep,
  totalSteps,
  onSelectStep,
  onNext,
  onSkip,
  nextLabel = 'Siguiente',
  showNextArrow = true,
  secondaryAction = null,
}) {
  const hasCopy = Boolean(title || description);

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-white">
      <section
        className="relative flex min-h-0 w-full flex-1 items-center justify-center"
      >
        {onSkip ? (
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
        ) : null}

        {image ? (
          <div className="onboarding-hero-in relative flex h-[clamp(17rem,52dvh,27rem)] w-[min(86vw,23rem)] items-center justify-center overflow-hidden rounded-radius-xl border border-app-border bg-white p-space-md shadow-elevation-2">
            <img
              src={image}
              alt={imageAlt}
              className="max-h-full max-w-full object-contain"
              decoding="async"
              fetchPriority={currentStep === 0 ? 'high' : 'auto'}
            />
          </div>
        ) : (
          <div className="h-8" aria-hidden />
        )}
      </section>

      <div className="shrink-0 px-5">
        {hasCopy ? (
          <div className="mx-auto w-[90%] pb-2 text-center">
            {title ? (
              <h1 className="onboarding-title-in text-[2rem] font-bold leading-[1.12] tracking-tight sm:text-[2.125rem]">
                {title}
              </h1>
            ) : null}
            {description ? (
              <div className="onboarding-desc-in mt-5 space-y-4 text-[0.9375rem] leading-[1.65] text-[#6B7280] sm:text-base">
                {description}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="w-full pt-4"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mb-6 flex justify-center gap-2.5" role="tablist" aria-label="Progreso del onboarding">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === currentStep}
                aria-label={`Paso ${i + 1} de ${totalSteps}`}
                onClick={() => onSelectStep?.(i)}
                className={[
                  'flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                ].join(' ')}
              >
                <span
                  className={[
                    'rounded-radius-circular transition-all duration-normal ease-out',
                    i === currentStep ? 'h-2.5 w-6 bg-primary-600' : 'h-2 w-2 bg-app-border',
                  ].join(' ')}
                  aria-hidden
                />
              </button>
            ))}
          </div>

          <div className="mx-auto flex w-[90%] flex-col gap-space-md">
            <button
              type="button"
              onClick={onNext}
              className="relative inline-flex h-btn-primary w-full items-center justify-center rounded-radius-lg bg-primary-600 px-space-xl text-body font-semibold text-white shadow-elevation-3 transition-colors duration-fast ease-out hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              {nextLabel}
              {showNextArrow ? (
                <ChevronRight className="absolute right-5 h-5 w-5" aria-hidden />
              ) : null}
            </button>
            {secondaryAction}
          </div>
        </div>
      </div>
    </div>
  );
}
