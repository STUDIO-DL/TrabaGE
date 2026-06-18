import OnboardingScreen from './OnboardingScreen';
import onboardingIllustration from '../../assets/illustrations/onboarding-visibility-network.png';

export default function OnboardingScreenTwo({ currentStep = 1, onNext, onSkip, onBack }) {
  return (
    <OnboardingScreen
      image={onboardingIllustration}
      imageAlt="Red de perfiles profesionales y empresas conectados con oportunidades"
      currentStep={currentStep}
      onNext={onNext}
      onSkip={onSkip}
      onBack={onBack}
      title={
        <span className="text-[#0F172A]">
          Tu trabajo merece más{' '}
          <span className="text-[#2563EB]">visibilidad</span>.
        </span>
      }
      description={
        <>
          <p>
            No importa si buscas empleo, ofreces servicios o quieres hacer crecer tu negocio.
          </p>
          <p className="mt-4">
            TrabaGE te ayuda a conectar con empresas, clientes y personas que necesitan lo que sabes
            hacer.
          </p>
        </>
      }
    />
  );
}
