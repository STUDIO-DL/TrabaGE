import { Briefcase } from 'lucide-react';
import OnboardingScreen from './OnboardingScreen';

export default function OnboardingScreenTwo({ currentStep = 0, onNext, onSkip }) {
  return (
    <OnboardingScreen
      icon={Briefcase}
      iconLabel="Icono de un maletín de trabajo"
      currentStep={currentStep}
      onNext={onNext}
      onSkip={onSkip}
      title={
        <span className="text-slate-900">Tu trabajo merece más visibilidad.</span>
      }
      description="No importa si buscas empleo, ofreces servicios o quieres hacer crecer tu cuenta Business. TrabaGE te ayuda a conectar con oportunidades, clientes y personas que necesitan lo que sabes hacer."
      buttonText="Siguiente"
    />
  );
}