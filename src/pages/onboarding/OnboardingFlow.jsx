import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Camera,
  Check,
  MapPin,
  Plus,
  Search,
  Settings,
} from '../../constants/icons';
import { Handshake } from 'lucide-react';
import AppAvatar from '../../components/common/AppAvatar';
import AppIcon from '../../components/common/AppIcon';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import TrabaGEWordmark from '../../components/branding/TrabaGEWordmark';
import Button from '../../components/ui/Button';
import {
  DEFAULT_ONBOARDING_COUNTRY,
  EXPERIENCE_OPTIONS,
  ONBOARDING_COUNTRIES,
  OPPORTUNITY_TYPES,
  PROFESSIONS,
  STUDENT_OPPORTUNITY_TYPES,
  STUDY_STAGES,
  TRABAGE_GOALS,
  getCitiesForOnboardingCountry,
  getOnboardingCurrentStep,
  getOnboardingData,
  getOnboardingTotalSteps,
  getOpportunityCitiesForData,
  getSkillsForOnboarding,
  isOnboardingCompleted,
} from '../../constants/onboarding';
import { getOwnCandidateProfileKey } from '../../constants/profileQueryKeys';
import { ROLES, isPersonalRole, ROLE_PROFILE } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { onboardingService } from '../../services/onboarding.service';
import { bootstrapProfile } from '../../services/profileBootstrap';
import { profileService } from '../../services/profile.service';
import { validateFile } from '../../utils/validateFile';
import { withDevDiagnostics } from '../../utils/devDiagnostics';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { storageService } from '../../services/storage.service';
import { avatarPath, STORAGE_BUCKETS } from '../../constants/storage';
import { versionedStoragePath } from '../../utils/storagePaths';
import { queryClient } from '../../config/queryClient';

const STUDY_STAGE_EMOJI = {
  'Formación profesional': '🎓',
  'Grado / Universidad': '📚',
  Bachillerato: '🏫',
  Máster: '🎓',
  Doctorado: '🔬',
  'Curso / Formación especializada': '📖',
  'Acabo de empezar': '🌱',
};

function joinList(values, fallback) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  return list.length ? list.join(' · ') : fallback;
}

function addUnique(list, value) {
  const text = String(value || '').trim();
  if (!text) return list;
  return list.includes(text) ? list.filter((item) => item !== text) : [...list, text];
}

function SegmentedProgress({ step, total }) {
  return (
    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden>
      <span
        className="block h-full rounded-full bg-primary-600 transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(step / total, 1)) * 100}%` }}
      />
    </div>
  );
}

function Header({ step, total, onBack }) {
  return (
    <header className="shrink-0 px-5 pt-[max(0.8rem,env(safe-area-inset-top))] pb-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-app-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Atrás"
        >
          <AppIcon icon={ArrowLeft} size={18} aria-hidden />
        </button>
        <SegmentedProgress step={step} total={total} />
        <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-app-text">
          {step} / {total}
        </span>
      </div>
    </header>
  );
}

function ScreenShell({ title, subtitle, children, compact = false, scrollable = false }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col px-4 pb-1 pt-2">
      <div className="shrink-0 text-center">
        <TrabaGEWordmark size="md" className="mx-auto" />
        <h1 className="mt-2 text-base font-bold leading-snug text-app-text">{title}</h1>
        {subtitle ? (
          <p className="mx-auto mt-0.5 max-w-[18rem] text-[11px] leading-snug text-app-muted">{subtitle}</p>
        ) : null}
      </div>
      <div
        className={[
          'min-h-0 flex-1',
          compact ? 'mt-2' : 'mt-2.5',
          scrollable ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
        ].join(' ')}
      >
        {children}
      </div>
    </section>
  );
}

function GoalIllustration({ goal }) {
  if (goal === 'employment') {
    return (
      <span className="relative mx-auto block h-16 w-16" aria-hidden>
        <span className="absolute left-1 top-3 flex h-10 w-12 items-center justify-center rounded-md border-2 border-[#2B3A67] bg-[#F8FAFF] text-[#2B3A67] shadow-sm">
          <AppIcon icon={Briefcase} size={34} strokeWidth={1.7} />
        </span>
        <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2B3A67]">
          <AppIcon icon={Search} size={26} strokeWidth={2.1} />
        </span>
      </span>
    );
  }

  if (goal === 'services') {
    return (
      <span className="relative mx-auto block h-16 w-16" aria-hidden>
        <span className="absolute left-2 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
          <AppIcon icon={Settings} size={38} strokeWidth={1.8} />
        </span>
        <span className="absolute bottom-0 left-1/2 flex h-9 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-[#FEF3C7] text-[#2B3A67] ring-2 ring-white">
          <AppIcon icon={Handshake} size={31} strokeWidth={1.9} />
        </span>
      </span>
    );
  }

  return (
    <span className="relative mx-auto block h-16 w-16" aria-hidden>
      <span className="absolute left-2 top-2 flex h-10 w-12 items-center justify-center rounded-md border-2 border-[#2B3A67] bg-[#F8FAFF] text-[#2B3A67] shadow-sm">
        <AppIcon icon={Briefcase} size={33} strokeWidth={1.7} />
      </span>
      <span className="absolute bottom-0 left-1/2 flex h-8 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-[#FEF3C7] text-[#2B3A67] ring-2 ring-white">
        <AppIcon icon={Handshake} size={30} strokeWidth={1.9} />
      </span>
    </span>
  );
}

function GoalCard({ selected, goal, title, description, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'relative flex min-h-[178px] flex-1 flex-col items-center justify-start rounded-md border px-2.5 py-4 text-center transition',
        selected
          ? 'border-primary-500 bg-white shadow-[0_16px_28px_rgba(43,58,103,0.16)] -translate-y-1'
          : 'border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.10)] hover:border-primary-200 hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
      ].join(' ')}
    >
      {selected ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white">
          <AppIcon icon={Check} size={10} aria-hidden />
        </span>
      ) : null}
      <GoalIllustration goal={goal} />
      <span className="mt-3 block text-[11px] font-bold leading-tight text-app-text">{title}</span>
      <span className="mt-1.5 block max-w-[6.6rem] text-[10px] leading-snug text-app-muted">
        {description}
      </span>
    </button>
  );
}

function SelectRow({ selected, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition',
        selected ? 'border-primary-600 bg-primary-50/70' : 'border-app-border bg-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
      ].join(' ')}
    >
      <span className="truncate pr-2">{children}</span>
      {selected ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
          <AppIcon icon={Check} size={12} aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function Chip({ selected, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs leading-tight transition',
        selected
          ? 'border-primary-600 bg-primary-50 text-app-text'
          : 'border-app-border bg-white text-app-text hover:border-primary-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
      ].join(' ')}
    >
      <span>{children}</span>
      {selected ? (
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-600 text-white">
          <AppIcon icon={Check} size={8} aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block shrink-0">
      <span className="sr-only">{placeholder}</span>
      <AppIcon
        icon={Search}
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle"
        aria-hidden
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-app-border bg-white pl-9 pr-3 text-app-text outline-none transition placeholder:text-app-subtle focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
      />
    </label>
  );
}

function BottomActions({
  onNext,
  onSkip,
  onCompleteProfile,
  nextLabel = 'Siguiente',
  loading = false,
  final = false,
  showSkip = true,
}) {
  if (final) {
    return (
      <footer className="shrink-0 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        <p className="mb-1.5 text-center text-[9px] leading-snug text-app-muted">
          Siempre podrás modificar esta información desde tu perfil.
        </p>
        <Button
          type="button"
          fullWidth
          loading={loading}
          onClick={onNext}
          className="!h-9 !rounded-lg !text-[13px] !font-semibold"
        >
          Entrar en TrabaGE
          <AppIcon icon={ArrowRight} size={16} aria-hidden />
        </Button>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={onCompleteProfile}
          className="mt-1.5 !h-9 !rounded-lg !border-primary-200 !text-[13px] !font-semibold !text-primary-700"
        >
          Completar perfil
        </Button>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 px-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1.5">
      <Button
        type="button"
        fullWidth
        loading={loading}
        onClick={onNext}
        className="!h-10 !rounded-md !text-[12px] !font-semibold shadow-[0_10px_20px_rgba(37,99,235,0.22)]"
      >
        {nextLabel}
        <AppIcon icon={ArrowRight} size={16} aria-hidden />
      </Button>
      {showSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="mt-2 block w-full py-1.5 text-center text-[11px] font-medium text-app-text underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Omitir
        </button>
      ) : null}
    </footer>
  );
}

function GoalScreen({ data, save }) {
  return (
    <ScreenShell
      title="¿Qué buscas en TrabaGE?"
      subtitle="Elige cómo quieres aprovechar TrabaGE."
      compact
    >
      <div className="mx-auto flex w-full max-w-[366px] gap-2.5 pt-3">
        {TRABAGE_GOALS.map((goal) => (
          <GoalCard
            key={goal.value}
            selected={data.trabage_goal === goal.value}
            goal={goal.value}
            title={goal.title}
            description={goal.description}
            onClick={() => save({ trabage_goal: goal.value })}
          />
        ))}
      </div>
    </ScreenShell>
  );
}

function ProfessionScreen({ data, save }) {
  const [query, setQuery] = useState('');
  const professions = PROFESSIONS.filter((item) =>
    item.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const chooseProfession = (profession) =>
    save({ user_type: 'professional', profession, study_area: null, study_stage: null });

  return (
    <ScreenShell
      title="¿Cuál es tu profesión o área?"
      subtitle="Cuéntanos a qué te dedicas para personalizar tu perfil."
      scrollable
    >
      <SearchBox value={query} onChange={setQuery} placeholder="Buscar profesión..." />
      <div className="mt-2 flex min-h-0 flex-1 flex-wrap content-start gap-1.5 overflow-hidden">
        {professions.map((profession) => (
          <Chip
            key={profession}
            selected={data.profession === profession && data.user_type !== 'student'}
            onClick={() => chooseProfession(profession)}
          >
            {profession}
          </Chip>
        ))}
        {query.trim() && !professions.includes(query.trim()) ? (
          <Chip selected={data.profession === query.trim()} onClick={() => chooseProfession(query.trim())}>
            + {query.trim()}
          </Chip>
        ) : null}
      </div>
      <div className="mt-2 shrink-0 space-y-2 border-t border-app-border pt-2">
        <button
          type="button"
          aria-pressed={data.user_type === 'student'}
          onClick={() => save({ user_type: 'student', profession: null })}
          className={[
            'w-full rounded-lg border px-3 py-2.5 text-left transition',
            data.user_type === 'student'
              ? 'border-primary-600 bg-primary-50/70'
              : 'border-primary-200 bg-primary-50/40',
          ].join(' ')}
        >
          <p className="text-xs font-bold text-app-text">🎓 Soy estudiante</p>
          <p className="mt-0.5 text-[10px] leading-snug text-app-muted">
            Estoy estudiando y quiero desarrollar mi perfil profesional.
          </p>
        </button>
        <button
          type="button"
          className="mx-auto block text-[11px] font-semibold text-primary-700 underline"
          onClick={() => save({ profession: null, user_type: 'professional' })}
        >
          No quiero indicarlo ahora
        </button>
      </div>
    </ScreenShell>
  );
}

function StudyStageScreen({ data, save }) {
  return (
    <ScreenShell title="¿En qué etapa de tus estudios estás?" subtitle="Cuéntanos un poco sobre tu formación." scrollable>
      <div className="space-y-1">
        {STUDY_STAGES.map((stage) => (
          <SelectRow
            key={stage}
            selected={data.study_stage === stage}
            onClick={() => save({ study_stage: stage })}
          >
            {STUDY_STAGE_EMOJI[stage] ? `${STUDY_STAGE_EMOJI[stage]} ` : ''}
            {stage}
          </SelectRow>
        ))}
      </div>
      <button
        type="button"
        className="mx-auto mt-3 block text-[11px] font-semibold text-app-muted underline"
        onClick={() => save({ study_stage: null })}
      >
        Prefiero no indicarlo
      </button>
    </ScreenShell>
  );
}

function LocationScreen({ data, save, onLocate }) {
  const [manual, setManual] = useState(Boolean(data.city));
  const [pickerCountry, setPickerCountry] = useState(data.country || DEFAULT_ONBOARDING_COUNTRY);
  const locationLabel =
    [data.city, data.country].filter(Boolean).join(', ') ||
    `Malabo, ${DEFAULT_ONBOARDING_COUNTRY}`;
  const cityOptions = getCitiesForOnboardingCountry(pickerCountry);

  const chooseCountry = (country) => {
    setPickerCountry(country);
    save({ country, city: null, location_method: 'manual' });
  };

  const chooseCity = (city) => {
    save({ city, country: pickerCountry, location_method: 'manual' });
    setManual(false);
  };

  return (
    <ScreenShell
      title="¿Dónde te encuentras?"
      subtitle="Usaremos tu ubicación para mostrarte oportunidades relevantes."
      scrollable={manual}
    >
      <div className="rounded-xl border border-app-border overflow-hidden">
        <div className="relative h-[4.5rem] bg-gradient-to-b from-slate-100 to-slate-200">
          <div className="absolute inset-0 opacity-40">
            <svg viewBox="0 0 320 72" className="h-full w-full" aria-hidden>
              <path d="M0 72 Q80 40 160 56 T320 48 V96 H0Z" fill="#cbd5e1" />
            </svg>
          </div>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-primary-600">
            <AppIcon icon={MapPin} size={22} aria-hidden />
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-app-border px-2.5 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] font-bold text-app-text">
              <AppIcon icon={MapPin} size={11} aria-hidden />
              Tu ubicación actual
            </p>
            <p className="truncate text-[11px] text-app-muted">{locationLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPickerCountry(data.country || DEFAULT_ONBOARDING_COUNTRY);
              setManual(true);
            }}
            className="shrink-0 text-[10px] font-semibold text-primary-700 underline"
          >
            Cambiar
          </button>
        </div>
      </div>

      <div className="mt-1.5 space-y-1">
        <button
          type="button"
          onClick={onLocate}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 text-xs font-semibold text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <AppIcon icon={MapPin} size={14} aria-hidden />
          Usar mi ubicación
        </button>
        <button
          type="button"
          onClick={() => {
            setPickerCountry(data.country || DEFAULT_ONBOARDING_COUNTRY);
            setManual((value) => !value);
          }}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-primary-300 bg-white text-xs font-semibold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span aria-hidden>🗺️</span>
          Elegir ubicación manualmente
        </button>
      </div>

      {manual ? (
        <div className="mt-1.5 space-y-1.5">
          <div>
            <label htmlFor="onboarding-country" className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-app-muted">
              País
            </label>
            <select
              id="onboarding-country"
              value={pickerCountry}
              onChange={(e) => chooseCountry(e.target.value)}
              className="h-9 w-full rounded-lg border border-app-border bg-white px-2.5 text-xs text-app-text outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
            >
              {ONBOARDING_COUNTRIES.map(({ country }) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-app-muted">
              Ciudad
            </p>
            <div className="flex flex-wrap gap-1">
              {cityOptions.map((city) => (
                <Chip
                  key={`${pickerCountry}-${city}`}
                  selected={data.city === city && data.country === pickerCountry}
                  onClick={() => chooseCity(city)}
                >
                  {city}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-1.5 rounded-lg border border-primary-100 bg-primary-50/80 px-2.5 py-1.5">
        <p className="flex items-center gap-1 text-[10px] font-bold text-app-text">
          <span aria-hidden>🔒</span>
          Tu ubicación es privada
        </p>
        <p className="mt-0.5 text-[9px] leading-snug text-app-muted">
          Tu ubicación exacta no tiene por qué aparecer públicamente.
        </p>
      </div>
    </ScreenShell>
  );
}

function ExperienceScreen({ data, save }) {
  return (
    <ScreenShell
      title="¿Cuánta experiencia tienes?"
      subtitle="No hace falta añadir todavía tus trabajos anteriores."
      scrollable
    >
      <div className="space-y-1">
        {EXPERIENCE_OPTIONS.map((option) => (
          <SelectRow
            key={option}
            selected={data.experience_range === option}
            onClick={() => save({ experience_range: option })}
          >
            {option === 'Sin experiencia' ? '🌱 ' : ''}
            {option}
          </SelectRow>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] leading-snug text-app-muted">
        Después podrás añadir empresas, cargos y fechas desde tu perfil.
      </p>
    </ScreenShell>
  );
}

function MultiSelectScreen({ title, subtitle, dataKey, options, data, save, addLabel }) {
  const [query, setQuery] = useState('');
  const selected = Array.isArray(data[dataKey]) ? data[dataKey] : [];
  const visible = options.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (value) => save({ [dataKey]: addUnique(selected, value) });

  return (
    <ScreenShell title={title} subtitle={subtitle} scrollable>
      <SearchBox value={query} onChange={setQuery} placeholder={addLabel} />
      <div className="mt-2 flex min-h-0 flex-1 flex-wrap content-start gap-1.5 overflow-hidden">
        {visible.map((option) => (
          <Chip key={option} selected={selected.includes(option)} onClick={() => toggle(option)}>
            {option}
          </Chip>
        ))}
        {query.trim() && !visible.includes(query.trim()) ? (
          <Chip selected={selected.includes(query.trim())} onClick={() => toggle(query.trim())}>
            <span className="inline-flex items-center gap-0.5">
              <AppIcon icon={Plus} size={12} aria-hidden />
              {query.trim()}
            </span>
          </Chip>
        ) : null}
      </div>
      <p className="mt-2 text-center text-[10px] text-app-muted underline">Puedes seleccionar varias.</p>
    </ScreenShell>
  );
}

function OpportunitiesScreen({ data, save, student = false }) {
  const typeOptions = student ? STUDENT_OPPORTUNITY_TYPES : OPPORTUNITY_TYPES;
  const selectedTypes = Array.isArray(data.opportunity_types) ? data.opportunity_types : [];
  const selectedLocations = Array.isArray(data.opportunity_locations) ? data.opportunity_locations : [];
  const cityOptions = getOpportunityCitiesForData(data);

  return (
    <ScreenShell
      title={student ? '¿Qué oportunidades te interesan?' : '¿Qué tipo de oportunidades te interesan?'}
      subtitle={
        student
          ? 'Te mostraremos oportunidades adaptadas a tu etapa y formación.'
          : 'Selecciona las opciones que mejor encajan contigo.'
      }
      scrollable
    >
      <div className="flex flex-wrap gap-1.5">
        {typeOptions.map((type) => (
          <Chip
            key={type}
            selected={selectedTypes.includes(type)}
            onClick={() => save({ opportunity_types: addUnique(selectedTypes, type) })}
          >
            {type}
          </Chip>
        ))}
      </div>
      <h2 className="mt-3 text-xs font-bold text-app-text">
        ¿Dónde te gustaría encontrar oportunidades?
        {data.country ? (
          <span className="ml-1 font-normal text-app-muted">({data.country})</span>
        ) : null}
      </h2>
      <div className="mt-1.5 space-y-1">
        {cityOptions.map((city) => (
          <SelectRow
            key={city}
            selected={selectedLocations.includes(city) || data.city === city}
            onClick={() => save({ opportunity_locations: addUnique(selectedLocations, city) })}
          >
            {city}
          </SelectRow>
        ))}
      </div>
      {student ? (
        <p className="mt-2 text-center text-[10px] leading-snug text-app-muted">
          También podremos mostrarte oportunidades relacionadas con tu área de estudio.
        </p>
      ) : null}
    </ScreenShell>
  );
}

function ServicesScreen({ data, save, title, subtitle }) {
  const selected = Array.isArray(data.services) ? data.services : [];
  const options = data.skills?.length ? data.skills : getSkillsForOnboarding(data);
  const [query, setQuery] = useState('');
  const visible = options.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (value) => save({ services: addUnique(selected, value) });

  return (
    <ScreenShell title={title} subtitle={subtitle} scrollable>
      <SearchBox value={query} onChange={setQuery} placeholder="Buscar un servicio..." />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {visible.map((option) => (
          <Chip key={option} selected={selected.includes(option)} onClick={() => toggle(option)}>
            {option}
          </Chip>
        ))}
      </div>
    </ScreenShell>
  );
}

function BothInterestsScreen({ data, save }) {
  const selectedTypes = Array.isArray(data.opportunity_types) ? data.opportunity_types : [];
  const selectedServices = Array.isArray(data.services) ? data.services : [];
  const serviceOptions = data.skills?.length ? data.skills : getSkillsForOnboarding(data);

  return (
    <ScreenShell
      title="¿Qué oportunidades te interesan?"
      subtitle="Indica qué buscas y qué servicios quieres ofrecer."
      scrollable
    >
      <div className="flex flex-wrap gap-1.5">
        {OPPORTUNITY_TYPES.map((type) => (
          <Chip
            key={type}
            selected={selectedTypes.includes(type)}
            onClick={() => save({ opportunity_types: addUnique(selectedTypes, type) })}
          >
            {type}
          </Chip>
        ))}
      </div>
      <h2 className="mt-3 text-xs font-bold text-app-text">¿Qué servicios quieres ofrecer?</h2>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {serviceOptions.slice(0, 8).map((service) => (
          <Chip
            key={service}
            selected={selectedServices.includes(service)}
            onClick={() => save({ services: addUnique(selectedServices, service) })}
          >
            {service}
          </Chip>
        ))}
      </div>
    </ScreenShell>
  );
}

function PhotoScreen({ profile, onPhoto, onSkip, uploading, error }) {
  const inputRef = useRef(null);
  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (file) onPhoto(file);
    event.target.value = '';
  };

  return (
    <ScreenShell
      title="Haz que tu perfil sea reconocible"
      subtitle="Añade una foto para que empresas y profesionales puedan conocerte mejor."
    >
      <div className="flex flex-col items-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute -left-2 top-2 h-2 w-2 rounded-sm bg-primary-100" aria-hidden />
          <span className="absolute right-0 top-6 h-3 w-3 rotate-45 bg-primary-50" aria-hidden />
          <span className="absolute bottom-4 left-0 h-2 w-2 rounded-full bg-primary-100" aria-hidden />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-primary-100 bg-primary-50">
            <AppAvatar
              size="xl"
              src={profile?.avatar_path}
              name={profile?.full_name}
              className="!h-20 !w-20"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary-600 text-white">
              <AppIcon icon={Camera} size={14} aria-hidden />
            </span>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFile}
        />
        <Button
          type="button"
          fullWidth
          loading={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-3 !h-10 !max-w-[14rem] !rounded-xl !text-sm !font-semibold"
        >
          <AppIcon icon={Camera} size={16} aria-hidden />
          Añadir foto
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="mt-2 text-xs font-bold text-app-text underline-offset-2 hover:underline"
        >
          Ahora no
        </button>
        {error ? <p className="mt-2 text-center text-xs text-error-600">{error}</p> : null}
        <p className="mt-2 text-center text-[10px] leading-snug text-app-muted">
          Puedes añadir o cambiar tu foto cuando quieras desde tu perfil.
        </p>
      </div>
    </ScreenShell>
  );
}

function FinalScreen({ profile, data }) {
  const title = data.user_type === 'student'
    ? `Estudiante${data.study_stage ? ` · ${data.study_stage}` : ''}`
    : data.profession || profile?.headline || 'Profesional';

  return (
    <ScreenShell
      title="Tu perfil está listo 🎉"
      subtitle="Ya tienes lo esencial. Puedes completar más información cuando quieras."
      compact
    >
      <div className="rounded-xl border border-app-border bg-white text-left">
        <div className="flex gap-3 p-3">
          <AppAvatar size="lg" src={profile?.avatar_path} name={profile?.full_name} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-app-text">
              {profile?.full_name || 'Tu nombre'}
            </h2>
            <p className="mt-0.5 text-xs text-app-muted">{title}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-app-muted">
              <AppIcon icon={MapPin} size={12} aria-hidden />
              {[data.city || profile?.city, data.country || profile?.country].filter(Boolean).join(', ') ||
                'Añade tu ubicación'}
            </p>
          </div>
        </div>
        <div className="space-y-2 border-t border-app-border px-3 py-2.5 text-[11px]">
          <div>
            <p className="font-bold text-app-text">Habilidades</p>
            <p className="mt-0.5 text-app-muted">{joinList(data.skills, 'Añade tus habilidades')}</p>
          </div>
          <div>
            <p className="font-bold text-app-text">Experiencia</p>
            <p className="mt-0.5 text-app-muted">
              {data.user_type === 'student'
                ? data.study_stage || 'Añade tu etapa de estudios'
                : data.experience_range || 'Añade tu experiencia'}
            </p>
          </div>
          <div>
            <p className="font-bold text-app-text">
              {data.trabage_goal === 'services' ? 'Ofrece' : 'Buscando'}
            </p>
            <p className="mt-0.5 text-app-muted">
              {data.trabage_goal === 'services'
                ? joinList(data.services || data.skills, 'Añade servicios')
                : joinList(data.opportunity_types, 'Añade oportunidades de interés')}
            </p>
          </div>
        </div>
        <div className="border-t border-app-border bg-primary-50/70 px-3 py-2">
          <p className="flex items-center gap-2 text-[11px] text-app-text">
            <AppIcon icon={Check} size={14} className="text-primary-700" aria-hidden />
            Perfil básico completado
          </p>
        </div>
      </div>
    </ScreenShell>
  );
}

function renderStepBody(step, ctx) {
  const { data, profile, persist, locate, handlePhoto, avatarUploading, avatarError, skip } = ctx;

  if (step === 1) {
    return <GoalScreen data={data} save={(patch) => persist(patch)} />;
  }
  if (step === 2) {
    return <ProfessionScreen data={data} save={(patch) => persist(patch)} />;
  }

  if (data.user_type === 'student') {
    if (step === 3) return <StudyStageScreen data={data} save={(patch) => persist(patch)} />;
    if (step === 4) {
      return <LocationScreen data={data} save={(patch) => persist(patch)} onLocate={locate} />;
    }
    if (step === 5) {
      return (
        <MultiSelectScreen
          title="¿Qué habilidades estás desarrollando?"
          subtitle="Selecciona las habilidades que estás aprendiendo o que ya dominas."
          dataKey="skills"
          options={getSkillsForOnboarding(data)}
          data={data}
          save={(patch) => persist(patch)}
          addLabel="Buscar una habilidad..."
        />
      );
    }
    if (step === 6) {
      return <OpportunitiesScreen data={data} save={(patch) => persist(patch)} student />;
    }
    if (step === 7) {
      return (
        <PhotoScreen
          profile={profile}
          onPhoto={handlePhoto}
          onSkip={skip}
          uploading={avatarUploading}
          error={avatarError}
        />
      );
    }
    if (step === 8) return <FinalScreen profile={profile} data={data} />;
  } else {
    if (step === 3) {
      return <LocationScreen data={data} save={(patch) => persist(patch)} onLocate={locate} />;
    }
    if (step === 4) return <ExperienceScreen data={data} save={(patch) => persist(patch)} />;
    if (step === 5) {
      return (
        <MultiSelectScreen
          title="¿Qué habilidades estás desarrollando?"
          subtitle="Selecciona las habilidades que estás aprendiendo o que ya dominas."
          dataKey="skills"
          options={getSkillsForOnboarding(data)}
          data={data}
          save={(patch) => persist(patch)}
          addLabel="Buscar una habilidad..."
        />
      );
    }
    if (step === 6) {
      if (data.trabage_goal === 'services') {
        return (
          <ServicesScreen
            data={data}
            save={(patch) => persist(patch)}
            title="¿Qué servicios te gustaría ofrecer?"
            subtitle="Elige servicios relacionados con tu perfil."
          />
        );
      }
      if (data.trabage_goal === 'both') {
        return <BothInterestsScreen data={data} save={(patch) => persist(patch)} />;
      }
      return <OpportunitiesScreen data={data} save={(patch) => persist(patch)} />;
    }
    if (step === 7) {
      return (
        <PhotoScreen
          profile={profile}
          onPhoto={handlePhoto}
          onSkip={skip}
          uploading={avatarUploading}
          error={avatarError}
        />
      );
    }
    if (step === 8) return <FinalScreen profile={profile} data={data} />;
  }

  return <FinalScreen profile={profile} data={data} />;
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user, role, getHomePath, loading: authLoading, isPreviewMode } = useAuth();
  const bootstrapAttemptedRef = useRef(false);
  const [bootstrapError, setBootstrapError] = useState('');

  const profileQuery = useQuery({
    queryKey: getOwnCandidateProfileKey(user?.id) ?? ['profile', 'onboarding', 'disabled'],
    enabled: Boolean(user?.id) && !isPreviewMode && isPersonalRole(role),
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await profileService.getCandidateProfile(user.id);
      if (error) throw error;
      return data ?? null;
    },
  });

  const profile = profileQuery.data ?? null;
  const loading = profileQuery.isLoading;
  const loadError = profileQuery.error ?? null;

  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const data = useMemo(() => getOnboardingData(profile), [profile]);
  const total = getOnboardingTotalSteps(data);
  const rawStep = getOnboardingCurrentStep(profile, data);
  const step = Math.min(rawStep, total);

  const refetch = profileQuery.refetch;

  useEffect(() => {
    if (!user?.id || profile || loading || isPreviewMode || bootstrapAttemptedRef.current) return;
    bootstrapAttemptedRef.current = true;
    setBootstrapError('');
    void bootstrapProfile({ user, role: ROLES.PERSONAL })
      .then(({ error }) => {
        if (error) {
          setBootstrapError(
            withDevDiagnostics(getSupabaseErrorMessage(error, 'No se pudo preparar tu perfil.'), error),
          );
          bootstrapAttemptedRef.current = false;
          return;
        }
        void refetch();
      })
      .catch((err) => {
        setBootstrapError(
          withDevDiagnostics(getSupabaseErrorMessage(err, 'No se pudo preparar tu perfil.'), err),
        );
        bootstrapAttemptedRef.current = false;
      });
  }, [user, profile, loading, isPreviewMode, refetch]);

  useEffect(() => {
    if (!user?.id || !profile || step === rawStep) return;
    void onboardingService.setCurrentStep(user.id, profile, step);
  }, [profile, rawStep, step, user?.id]);

  useEffect(() => {
    if (!user?.id || !profile || isOnboardingCompleted(profile)) return;
    onboardingService.track(user.id, 'onboarding_screen_viewed', {
      screen: step,
      step,
      user_type: data.user_type || 'unknown',
    });
  }, [data.user_type, profile, step, user?.id]);

  if ((authLoading || loading || !role) && !isPreviewMode) {
    return <AuthLoadingScreen />;
  }

  if (!isPersonalRole(role)) {
    return <Navigate to={getHomePath() || '/login'} replace />;
  }

  if ((loadError || bootstrapError) && !profile) {
    const message = bootstrapError || withDevDiagnostics(getSupabaseErrorMessage(loadError), loadError);
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <p className="text-app-text">{message}</p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => {
              bootstrapAttemptedRef.current = false;
              setBootstrapError('');
              void refetch();
            }}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!profile && !loading) {
    return <AuthLoadingScreen />;
  }

  if (profile && isOnboardingCompleted(profile)) {
    return <Navigate to={getHomePath() || '/personal/feed'} replace />;
  }

  const persist = async (patch, nextStep = step) => {
    if (!user?.id || !profile) return;
    setSaving(true);
    const result = await onboardingService.saveStep(user.id, profile, patch, nextStep);
    setSaving(false);
    if (!result.error) {
      onboardingService.track(user.id, 'onboarding_option_selected', {
        screen: step,
        step,
        option: Object.keys(patch).join(','),
        user_type: patch.user_type || data.user_type || 'unknown',
      });
      await refetch();
    }
  };

  const goToStep = async (nextStep) => {
    if (!user?.id || !profile) return;
    setSaving(true);
    await onboardingService.setCurrentStep(user.id, profile, Math.min(Math.max(nextStep, 1), total));
    setSaving(false);
    await refetch();
  };

  const finishOnboarding = async () => {
    if (!user?.id || !profile) return;
    setSaving(true);
    if (Array.isArray(data.skills)) await onboardingService.addSkills(user.id, data.skills);
    if (Array.isArray(data.services)) await onboardingService.addServices(user.id, data.services);
    const result = await onboardingService.complete(user.id, profile);
    setSaving(false);
    if (!result.error) navigate('/personal/feed', { replace: true });
  };

  const completeProfile = async () => {
    if (!user?.id || !profile) return;
    setSaving(true);
    if (Array.isArray(data.skills)) await onboardingService.addSkills(user.id, data.skills);
    if (Array.isArray(data.services)) await onboardingService.addServices(user.id, data.services);
    const result = await onboardingService.complete(user.id, profile);
    setSaving(false);
    if (!result.error) navigate(ROLE_PROFILE[ROLES.PERSONAL], { replace: true });
  };

  const next = async () => {
    if (!user?.id || !profile) return;
    onboardingService.track(user.id, 'onboarding_screen_completed', {
      screen: step,
      step,
      user_type: data.user_type || 'unknown',
    });
    if (step >= total) {
      await finishOnboarding();
      return;
    }
    await goToStep(step + 1);
  };

  const skip = async () => {
    if (!user?.id || !profile) return;
    const skipped = Array.isArray(data.skipped_steps) ? data.skipped_steps : [];
    onboardingService.track(user.id, 'onboarding_skipped', {
      screen: step,
      step,
      user_type: data.user_type || 'unknown',
    });
    await persist({ skipped_steps: [...new Set([...skipped, step])] }, Math.min(step + 1, total));
  };

  const back = async () => {
    if (!user?.id || !profile) {
      navigate(-1);
      return;
    }
    onboardingService.track(user.id, 'onboarding_back_pressed', {
      screen: step,
      step,
      user_type: data.user_type || 'unknown',
    });
    if (step <= 1) {
      navigate(getHomePath() || '/personal/feed', { replace: true });
      return;
    }
    await goToStep(step - 1);
  };

  const locate = () => {
    const fallback = {
      city: 'Malabo',
      country: DEFAULT_ONBOARDING_COUNTRY,
      location_method: 'manual_fallback',
    };
    if (!navigator.geolocation) {
      void persist(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        void persist({ ...fallback, location_method: 'browser' });
      },
      () => {
        void persist(fallback);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
    );
  };

  const handlePhoto = async (file) => {
    setAvatarError('');
    const validation = validateFile(file, 'avatar');
    if (!validation.valid) {
      setAvatarError(validation.error);
      return;
    }
    setAvatarUploading(true);
    try {
      const { error: uploadError } = await storageService.uploadAvatar(
        user.id,
        file,
        profile?.avatar_path,
      );
      if (uploadError) {
        setAvatarError(getSupabaseErrorMessage(uploadError));
        return;
      }
      const nextPath = versionedStoragePath(
        avatarPath(user.id),
        STORAGE_BUCKETS.CANDIDATE_AVATARS,
      );
      const result = await onboardingService.saveStep(user.id, profile, { avatar_path: nextPath });
      if (result.error) {
        setAvatarError(getSupabaseErrorMessage(result.error));
        return;
      }
      queryClient.setQueryData(getOwnCandidateProfileKey(user.id), result.data);
      await refetch();
    } catch (err) {
      setAvatarError(getSupabaseErrorMessage(err));
    } finally {
      setAvatarUploading(false);
    }
  };

  const body = renderStepBody(step, {
    data,
    profile,
    persist,
    locate,
    handlePhoto,
    avatarUploading,
    avatarError,
    skip,
  });

  return (
    <div className="min-h-dvh bg-[#F8FAFC] md:flex md:items-center md:justify-center md:p-4">
      <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-white text-app-text md:h-[min(780px,100dvh)] md:rounded-2xl md:border md:border-[#E2E8F0] md:shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <Header step={step} total={total} onBack={back} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{body}</main>
        <BottomActions
          onNext={next}
          onSkip={skip}
          onCompleteProfile={completeProfile}
          loading={saving}
          final={step >= total}
          showSkip={step < total}
        />
      </div>
    </div>
  );
}
