import Button from '../ui/Button';

export default function OnboardingSlide({
  image,
  imageAlt = '',
  imageClassName = '',
  title,
  description,
  direction = 'forward',
  currentStep,
  totalSteps,
  onSelectStep,
  onFinish,
  isLastStep = false,
  swipeHandlers = null,
}) {
  const heroMotionClass =
    direction === 'backward' ? 'onboarding-hero-in--backward' : 'onboarding-hero-in--forward';

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col touch-pan-y" {...(swipeHandlers || {})}>
        <section className="onboarding-hero-section relative flex min-h-0 w-full flex-1 items-center justify-center">
          {image ? (
            <figure className={`${heroMotionClass} onboarding-hero-frame mx-auto`}>
              <span className="onboarding-hero-canvas" aria-hidden="true" />
              <img
                src={image}
                alt={imageAlt}
                className={['onboarding-hero-image', imageClassName].filter(Boolean).join(' ')}
                decoding="async"
                fetchPriority={currentStep === 0 ? 'high' : 'auto'}
                draggable={false}
              />
            </figure>
          ) : (
            <div className="h-8" aria-hidden />
          )}
        </section>

        <div className="shrink-0 px-5 pb-5">
          <div className="mx-auto w-[min(92%,22rem)] text-center">
            <div className="flex min-h-[3.25rem] items-end justify-center sm:min-h-[3.5rem]">
              {title ? (
                <h1 className="onboarding-title-in line-clamp-2 text-[1.3125rem] font-semibold leading-snug tracking-tight text-app-text sm:text-[1.375rem]">
                  {title}
                </h1>
              ) : null}
            </div>

            <div className="mt-space-md flex min-h-[2.75rem] items-start justify-center sm:min-h-[3rem]">
              {description ? (
                <p className="onboarding-desc-in line-clamp-2 text-body leading-snug text-app-muted">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        className="shrink-0 px-5 pt-1"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mb-6 flex justify-center gap-2.5" role="tablist" aria-label="Progreso del onboarding">
          {Array.from({ length: totalSteps }, (_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === currentStep}
              aria-label={`Paso ${index + 1} de ${totalSteps}`}
              onClick={() => onSelectStep?.(index)}
              className="flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              <span
                className={[
                  'rounded-radius-circular transition-all duration-normal ease-out',
                  index === currentStep ? 'h-2 w-6 bg-primary-600' : 'h-2 w-2 bg-app-border',
                ].join(' ')}
                aria-hidden
              />
            </button>
          ))}
        </div>

        <div className="mx-auto flex w-[min(86vw,23rem)] flex-col items-center gap-space-md">
          {isLastStep && onFinish ? (
            <Button
              onClick={onFinish}
              size="lg"
              className="min-w-[11.5rem] px-space-2xl shadow-elevation-1 sm:min-w-[12.5rem]"
            >
              Comenzar
            </Button>
          ) : (
            <span className="sr-only" aria-live="polite">
              Desliza para continuar
            </span>
          )}
        </div>
      </div>
    </>
  );
}
