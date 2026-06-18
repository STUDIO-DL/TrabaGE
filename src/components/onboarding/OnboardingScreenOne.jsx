import OnboardingScreen from './OnboardingScreen';
import onboardingIllustration from '../../assets/illustrations/onboarding-talent-map.png';

export default function OnboardingScreenOne({ currentStep = 0, onNext, onSkip }) {
  return (
    <OnboardingScreen
      image={onboardingIllustration}
      imageAlt="Mapa de Guinea Ecuatorial con oportunidades conectadas en todo el país"
      currentStep={currentStep}
      onNext={onNext}
      onSkip={onSkip}
      title={
        <>
          <span className="block text-[#0F172A]">El talento está en todas partes.</span>
          <span className="mt-1 block text-[#2563EB]">Las oportunidades no.</span>
        </>
      }
      description={
        <>
          <p>
            Personas con talento, experiencia y ganas de trabajar existen en cada ciudad, cada barrio
            y cada comunidad.
          </p>
          <p className="mt-4">Lo difícil muchas veces no es tener capacidad.</p>
          <p className="mt-4 font-bold text-[#2563EB]">Es ser visto.</p>
        </>
      }
    />
  );
}
