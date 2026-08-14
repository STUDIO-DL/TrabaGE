import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import AutocompleteInput from '../../components/ui/AutocompleteInput';
import { STUDY_AREAS, STUDENT_STAGES } from '../../constants/studyAreas';
import { SECTORS } from '../../constants/sectors';
import { SKILL_SUGGESTIONS, filterSkillSuggestions } from '../../constants/skills';
import { getSkillsForStudyArea } from '../../constants/skillsByStudyArea';

const STORAGE_KEY = 'trabage_onboarding_student_v1';

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('');
  const [area, setArea] = useState('');
  const [sector, setSector] = useState('');
  const [skillQuery, setSkillQuery] = useState('');
  const [skills, setSkills] = useState([]);
  const [saving, setSaving] = useState(false);

  const areaSuggestions = useMemo(() => STUDY_AREAS.map((a) => ({ value: a, label: a })), []);

  const dynamicSkillSuggestions = useMemo(() => {
    const fromArea = getSkillsForStudyArea(area);
    const merged = Array.from(new Set([...(fromArea || []), ...SKILL_SUGGESTIONS]));
    return filterSkillSuggestions(skillQuery, skills, 8).concat(
      merged.filter((s) => !skills.includes(s) && s.toLowerCase().includes(skillQuery.toLowerCase())),
    );
  }, [area, skillQuery, skills]);

  const addSkill = (name) => {
    if (!name) return;
    if (skills.includes(name)) return;
    setSkills((s) => [...s, name]);
    setSkillQuery('');
  };

  const removeSkill = (name) => setSkills((s) => s.filter((x) => x !== name));

  const canNext = stage && area;

  const handleNext = () => {
    setSaving(true);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ stage, area, sector, skills, savedAt: Date.now() }),
      );
    } catch {
      // ignore
    }
    setSaving(false);
    // Optimistic navigate to EditIntro (next logical step)
    navigate('/personal/profile/edit-intro');
  };

  return (
    <FormPageLayout title="Estudiante — Dinos sobre tus estudios">
      <div className="space-y-space-md p-space-base">
        <div>
          <label className="mb-2 block text-sm font-medium">Etapa</label>
          <Select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            options={[{ value: '', label: 'Seleccionar etapa' }, ...STUDENT_STAGES.map((s) => ({ value: s.value, label: s.label }))]}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">¿Qué estás estudiando?</label>
          <Select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            options={[{ value: '', label: 'Seleccionar área' }, ...areaSuggestions.map((a) => ({ value: a.value, label: a.label }))]}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Sector de interés (opcional)</label>
          <Select value={sector} onChange={(e) => setSector(e.target.value)} options={[{ value: '', label: 'Sin preferencia' }, ...SECTORS.map((s) => ({ value: s, label: s }))]} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Habilidades relevantes</label>
          <AutocompleteInput
            value={skillQuery}
            onChange={setSkillQuery}
            onSelect={addSkill}
            suggestions={dynamicSkillSuggestions}
            placeholder="Busca o añade una habilidad"
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
