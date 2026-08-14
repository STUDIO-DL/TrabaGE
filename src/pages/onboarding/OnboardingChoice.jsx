import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import ChoiceCard from '../../components/onboarding/ChoiceCard';
import useOnboardingPrefetch from '../../hooks/useOnboardingPrefetch';

const STORAGE_KEY = 'trabage_onboarding_choice_v1';

const OPTIONS = [
  {
    key: 'find_job',
    title: 'Encontrar empleo',
    description: 'Quiero descubrir oportunidades laborales.',
  },
  {
    key: 'offer_services',
    title: 'Ofrecer mis servicios',
    description: 'Quiero que otras personas puedan encontrarme.',
  },
  {
    key: 'both',
    title: 'Ambas',
    description: 'Quiero aprovechar todas las oportunidades.',
  },
];

export default function OnboardingChoice() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useOnboardingPrefetch();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSelected(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const handleSelect = (key) => {
    setSelected(key);
  };

  const handleSkip = () => {
    // Mark skipped in local storage for now
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ skipped: true }));
    } catch {
      // ignore
    }
    navigate('/onboarding');
  };

  const handleNext = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // Persist locally. Backend persistence deferred until user confirms next steps.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected }));
    } catch {
      // ignore
    }
    // Optimistic navigation: do not wait for any network
    // Route to the next onboarding screen based on selection
    if (selected === 'find_job') navigate('/onboarding/professional?mode=job');
    else if (selected === 'offer_services') navigate('/onboarding/professional?mode=offer');
    else if (selected === 'both') navigate('/onboarding/professional?mode=both');
  };

  return (
    <FormPageLayout title="¿Qué buscas en TrabaGE?">
      <div className="px-space-base pb-space-base">
        <div className="space-y-space-sm">
          {OPTIONS.map((opt) => (
            <ChoiceCard
              key={opt.key}
              title={opt.title}
              description={opt.description}
              selected={
                selected && (typeof selected === 'string' ? selected === opt.key : selected?.selected === opt.key)
              }
              onClick={() => handleSelect(opt.key)}
            />
          ))}
        </div>

        <div className="mt-space-lg fixed bottom-0 left-0 right-0 z-50 bg-app-bg/90 backdrop-blur-sm p-space-base border-t border-app-divider" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-[42rem] mx-auto flex gap-3">
            <Button type="button" variant="ghost" onClick={handleSkip} className="flex-1">
              Omitir
            </Button>
            <Button type="button" onClick={handleNext} disabled={!selected} loading={saving} className="flex-1">
              Siguiente →
            </Button>
          </div>
        </div>
      </div>
    </FormPageLayout>
  );
}
