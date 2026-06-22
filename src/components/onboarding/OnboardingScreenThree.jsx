import { TrendingUp } from 'lucide-react';
import OnboardingScreen from './OnboardingScreen';

export default function OnboardingScreenThree({ currentStep = 0, onNext, onSkip }) {
  return (
    <OnboardingScreen
      icon={TrendingUp}
      iconLabel="Icono de una flecha de tendencia ascendente"
      currentStep={currentStep}
      onNext={onNext}
      onSkip={onSkip}
      title={
        <span className="text-slate-900">Haz que las oportunidades te encuentren.</span>
      }
      description="Crea tu perfil, muestra tus habilidades y abre la puerta a nuevas posibilidades. Porque detrás de cada habilidad hay una historia, y detrás de cada oportunidad puede haber un futuro mejor."
      buttonText="Comenzar"
    />
  );
}