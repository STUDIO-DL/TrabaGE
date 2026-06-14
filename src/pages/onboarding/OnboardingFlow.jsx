import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { setOnboardingComplete } from '../../context/AuthContext';

const SLIDES = [
  {
    title: 'Encuentra tu próximo empleo',
    description: 'Explora oportunidades en Guinea Ecuatorial adaptadas a tu perfil.',
  },
  {
    title: 'Conecta con empresas',
    description: 'Sigue empresas verificadas y mantente al día con el feed profesional.',
  },
  {
    title: 'Aplica en minutos',
    description: 'Sube tu CV una vez y postula a múltiples empleos fácilmente.',
  },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const finish = () => {
    setOnboardingComplete();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white px-6 py-10">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-8 flex h-48 w-48 items-center justify-center rounded-3xl bg-primary-50 text-4xl">
          {step + 1}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{slide.title}</h1>
        <p className="mt-3 max-w-sm text-gray-500">{slide.description}</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === step ? 'bg-primary-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        {isLast ? (
          <Button fullWidth onClick={finish}>
            Comenzar
          </Button>
        ) : (
          <Button fullWidth onClick={() => setStep((s) => s + 1)}>
            Siguiente
          </Button>
        )}
        {!isLast && (
          <Button variant="ghost" fullWidth onClick={finish}>
            Saltar
          </Button>
        )}
      </div>
    </div>
  );
}
