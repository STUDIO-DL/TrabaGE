import OnboardingDots from './OnboardingDots';
import PrimaryButton from './PrimaryButton';
import onboardingIllustration from '../../assets/illustrations/onboarding-talent-simple.png';

export default function OnboardingScreenOne({
  image = onboardingIllustration,
  imageAlt = 'Profesionales diversos unidos: mecánico, modista, obrero y oficinista',
  currentStep = 0,
  onNext,
  onSkip,
}) {
  return (
    <div
      className="flex min-h-dvh flex-col bg-white"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <header className="flex shrink-0 justify-end px-6 pt-5">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          Saltar
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-6 pt-2">
        <img
          src={image}
          alt={imageAlt}
          className="onboarding-illustration-in h-[clamp(220px,52vw,280px)] w-auto max-w-full object-contain"
          decoding="async"
        />

        <h1 className="onboarding-title-in mt-10 max-w-[20rem] text-center text-[34px] font-extrabold leading-[1.1] tracking-tight">
          <span className="block text-[#0F172A]">El talento está en todas partes.</span>
          <span className="mt-1 block text-[#2563EB]">Las oportunidades no.</span>
        </h1>

        <div className="onboarding-body-in mt-6 max-w-[85%] text-center text-base leading-[1.7] text-[#64748B]">
          <p>
            Personas con talento, experiencia y ganas de trabajar existen en cada ciudad, cada barrio
            y cada comunidad.
          </p>
          <p className="mt-4">Lo difícil muchas veces no es tener capacidad.</p>
          <p className="mt-4 font-bold text-[#2563EB]">Es ser visto.</p>
        </div>
      </main>

      <footer className="shrink-0 px-6 pb-8">
        <OnboardingDots currentStep={currentStep} />
        <PrimaryButton onClick={onNext}>Siguiente</PrimaryButton>
      </footer>
    </div>
  );
}
