import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import AutocompleteInput from '../../components/ui/AutocompleteInput';
import Select from '../../components/ui/Select';
import { SKILL_SUGGESTIONS } from '../../constants/skills';
import { SERVICE_SUGGESTIONS } from '../../constants/services';
import { COUNTRIES, getCitiesForCountry, ALL_CITIES } from '../../constants/locations';

const STORAGE_KEY = 'trabage_onboarding_professional_v1';

export default function ProfessionalOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'job';

  const [professionQuery, setProfessionQuery] = useState('');
  const [profession, setProfession] = useState('');
  const [country, setCountry] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [city, setCity] = useState('');
  const [skills, setSkills] = useState([]);
  const [saving, setSaving] = useState(false);

  const professionSuggestions = useMemo(() => {
    const merged = Array.from(new Set([...SERVICE_SUGGESTIONS, ...SKILL_SUGGESTIONS]));
    if (!professionQuery) return merged.slice(0, 8);
    return merged.filter((s) => s.toLowerCase().includes(professionQuery.toLowerCase())).slice(0, 8);
  }, [professionQuery]);

  const cityPool = useMemo(() => (country ? getCitiesForCountry(country) : ALL_CITIES), [country]);
  const citySuggestions = useMemo(() => {
    if (!cityQuery) return cityPool.slice(0, 8);
    return cityPool.filter((c) => c.toLowerCase().includes(cityQuery.toLowerCase())).slice(0, 8);
  }, [cityQuery, cityPool]);

  const addSkill = (name) => {
    if (!name) return;
    if (skills.includes(name)) return;
    setSkills((s) => [...s, name]);
  };

  const removeSkill = (name) => setSkills((s) => s.filter((x) => x !== name));

  const canNext = Boolean(profession || skills.length);

  const handleNext = () => {
    setSaving(true);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, profession, country, city, skills, savedAt: Date.now() }),
      );
    } catch {}
    setSaving(false);
    navigate('/personal/profile/edit-intro');
  };

  return (
    <FormPageLayout title={mode === 'offer' ? 'Ofrecer mis servicios' : 'Encontrar empleo'}>
      <div className="space-y-space-md p-space-base">
        <div>
          <label className="mb-2 block text-sm font-medium">Profesión / Título</label>
          <AutocompleteInput
            value={professionQuery}
            onChange={setProfessionQuery}
            onSelect={(val) => {
              setProfession(val);
              setProfessionQuery('');
            }}
            suggestions={professionSuggestions}
            placeholder="Ej. Desarrollador frontend"
          />
          {profession ? <input type="hidden" name="profession" value={profession} /> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">País</label>
          <Select value={country} onChange={(e) => setCountry(e.target.value)} options={[{ value: '', label: 'Seleccionar país' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Ciudad</label>
          <AutocompleteInput
            value={cityQuery}
            onChange={setCityQuery}
            onSelect={(val) => {
              setCity(val);
              setCityQuery('');
            }}
            suggestions={citySuggestions}
            placeholder="Buscar ciudad..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Habilidades relevantes</label>
          <AutocompleteInput
            value={''}
            onChange={() => {}}
            onSelect={addSkill}
            suggestions={[...SKILL_SUGGESTIONS].slice(0, 12)}
            placeholder="Añadir habilidad"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-2 rounded-full border bg-app-surface px-3 py-1 text-sm">
                {s}
                <button type="button" onClick={() => removeSkill(s)} className="text-app-subtle">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate('/onboarding')} className="flex-1">
              Omitir
            </Button>
            <Button type="button" disabled={!canNext} loading={saving} onClick={handleNext} className="flex-1">
              Siguiente →
            </Button>
          </div>
        </div>
      </div>
    </FormPageLayout>
  );
}
