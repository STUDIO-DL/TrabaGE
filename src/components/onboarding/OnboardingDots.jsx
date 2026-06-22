export default function OnboardingDots({ currentStep, totalSteps = 3 }) {
  return (
    <div className="mb-sm flex justify-center gap-2" role="tablist" aria-label="Progreso del onboarding">
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          role="tab"
          aria-selected={i === currentStep}
          aria-label={`Paso ${i + 1} de ${totalSteps}`}
          className={[
            'h-2 w-2 rounded-full transition-colors duration-300',
            i === currentStep ? 'bg-primary-600' : 'bg-slate-300',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
