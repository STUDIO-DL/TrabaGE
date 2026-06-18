import OnboardingScreen from './OnboardingScreen';
import onboardingIllustration from '../../assets/illustrations/onboarding-opportunities-growth.png';

export default function OnboardingScreenThree({
  currentStep = 2,
  onNext,
  onSkip,
}) {
  return (
    <OnboardingScreen
      image={onboardingIllustration}
      imageAlt="Flecha de crecimiento con perfil verificado y oportunidades llegando"
      imageClassName="h-[clamp(260px,58vw,300px)]"
      currentStep={currentStep}
      onNext={onNext}
      onSkip={onSkip}
      nextLabel="Comenzar"
      showArrow
      title={
        <>
          <span className="block text-[#0F172A]">Haz que las oportunidades</span>
          <span className="mt-1 block text-[#2563EB]">te encuentren.</span>
        </>
      }
      description={
        <>
          <p>
            Crea tu perfil, muestra tus habilidades y abre la puerta a nuevas posibilidades.
          </p>
          <p className="mt-4">
            Porque detrás de cada habilidad hay una historia, y detrás de cada oportunidad puede
            haber un futuro mejor.
          </p>
        </>
      }
    />
  );
}
