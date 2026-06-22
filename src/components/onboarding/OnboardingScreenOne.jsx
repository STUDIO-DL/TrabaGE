import { Users } from 'lucide-react';
import OnboardingScreen from './OnboardingScreen';

export default function OnboardingScreenOne({ currentStep = 0, onNext, onSkip }) {
  return (
    <OnboardingScreen
      icon={Users}
      iconLabel="Icono de varias personas"
      currentStep={currentStep}
      onNext={onNext}
      onSkip={onSkip}
      title={
        <>
          <span className="block text-slate-900">El talento está en todas partes.</span>
          <span className="mt-1 block text-primary-600">Las oportunidades no.</span>
        </>
      }
      description={
        <>
          <p>
            Personas con talento, experiencia y ganas de trabajar existen en cada ciudad, cada barrio y cada comunidad.
          </p>
          <p className="mt-2">Lo difícil muchas veces no es tener capacidad.</p>
          <p className="mt-2 font-bold text-primary-600">Es ser visto.</p>
        </>
      }
      buttonText="Siguiente"
    />
  );
}
