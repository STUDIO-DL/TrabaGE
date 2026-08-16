import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Button from '../../components/ui/Button';

const OPTIONS = [
  {
    id: 'find_job',
    title: 'Encontrar empleo',
    subtitle: 'Quiero descubrir oportunidades laborales.',
    Icon: () => (
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="14" height="12" rx="1.5" stroke="#2B3A67" strokeWidth="1.2" fill="#F8FAFF" />
        <path d="M6 4.5V3.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="#2B3A67" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="19" cy="15" r="2" stroke="#2B3A67" strokeWidth="1.2" />
        <path d="M20.6 16.6L22 18" stroke="#2B3A67" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'offer_services',
    title: 'Ofrecer mis servicios',
    subtitle: 'Quiero que otras personas puedan encontrarme.',
    Icon: () => (
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="14" height="12" rx="1.5" stroke="#2B3A67" strokeWidth="1.2" fill="#F8FAFF" />
        <path d="M7.5 12.5l3 2 4-3" stroke="#2B3A67" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'both',
    title: 'Ambas',
    subtitle: 'Quiero encontrar oportunidades y ofrecer mis servicios.',
    Icon: () => (
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="14" height="12" rx="1.5" stroke="#2B3A67" strokeWidth="1.2" fill="#F8FAFF" />
        <path d="M7 12l3 2 5-4" stroke="#2B3A67" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="15" r="2" stroke="#2B3A67" strokeWidth="1.2" />
        <path d="M20.6 16.6L22 18" stroke="#2B3A67" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function OptionCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={[
        'w-full sm:w-[220px] rounded-xl p-3 text-left transition-transform transition-shadow duration-150 flex flex-col items-center',
        selected
          ? 'bg-white border border-transparent shadow-[0_14px_30px_rgba(43,58,103,0.12)] -translate-y-1.5'
          : 'bg-white border border-app-border',
      ].join(' ')}
      aria-pressed={selected}
    >
      <div className="mb-2">
        <option.Icon />
      </div>
      <h4 className="text-sm font-semibold text-app-text text-center">{option.title}</h4>
      <p className="text-caption text-app-muted text-center mt-1">{option.subtitle}</p>
    </button>
  );
}

export default function OnboardingStep1() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleNext = () => {
    if (!selected) return;
    try { localStorage.setItem('onboarding_choice', selected); } catch (e) {}
    navigate('/onboarding/step-2');
  };

  return (
    <PageContainer title="" backButton bottomNav={false}>
      <div className="max-w-[680px] mx-auto mt-8 p-4 sm:p-6 rounded-2xl shadow-elevation-1 bg-app-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 mr-3">
            <div className="h-2 bg-[#EEF5FF] rounded-full overflow-hidden">
              <div className="h-full bg-primary-600" style={{ width: '12.5%' }} />
            </div>
          </div>
          <div className="text-caption text-app-muted">1/8</div>
        </div>

        <div className="text-center mt-1">
          <h2 className="text-lg font-semibold text-app-text">TrabaGE</h2>
          <p className="text-body-small text-app-text font-semibold mt-2">¿Qué buscas en TrabaGE?</p>
          <p className="text-caption text-app-muted mt-1">Elige cómo quieres aprovechar TrabaGE.</p>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:justify-center sm:gap-5 gap-3">
          {OPTIONS.map((opt) => (
            <div key={opt.id} className="w-full sm:w-auto">
              <OptionCard option={opt} selected={selected === opt.id} onSelect={setSelected} />
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Button
            fullWidth
            disabled={!selected}
            onClick={handleNext}
            className="!rounded-[10px] !py-3"
          >
            <span className="flex items-center justify-center gap-2">Siguiente <span aria-hidden>→</span></span>
          </Button>

          <div className="text-center mt-3">
            <Link to="/" className="text-caption text-app-muted">Omitir</Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
