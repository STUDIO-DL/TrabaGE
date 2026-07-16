import { inferJobExperienceLevel } from './calculateJobMatch';
import { tokenize } from './matchingTokens';

const COMMON_SKILLS = [
  'react', 'javascript', 'typescript', 'python', 'java', 'sql', 'excel',
  'marketing', 'ventas', 'contabilidad', 'rrhh', 'diseño', 'figma',
  'comunicación', 'inglés', 'francés', 'node', 'angular', 'vue',
];

function inferRequiredSkills(job) {
  if (job.required_skills?.length) return job.required_skills;

  const haystack = [
    job.title,
    job.role,
    job.description,
    job.requirements,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const tokens = new Set(tokenize(haystack));
  return COMMON_SKILLS.filter((skill) => tokens.has(skill) || haystack.includes(skill));
}

function inferRequiredLanguages(job) {
  if (job.required_languages?.length) return job.required_languages;

  const haystack = [job.title, job.role, job.description, job.requirements].filter(Boolean).join(' ').toLowerCase();
  const languages = [];
  if (/(inglés|ingles|english)/.test(haystack)) languages.push('Inglés');
  if (/(francés|frances|french)/.test(haystack)) languages.push('Francés');
  if (/(portugués|portugues|portuguese)/.test(haystack)) languages.push('Portugués');
  return languages;
}

function inferEducationLevel(job) {
  if (job.education_level) return job.education_level;
  const text = [job.role, job.description, job.requirements].filter(Boolean).join(' ').toLowerCase();
  if (/(master|maestr|mba|posgrado)/.test(text)) return 'master';
  if (/(licenci|grado|universit|ingenier)/.test(text)) return 'degree';
  if (/(técnico|tecnico|fp)/.test(text)) return 'technical';
  if (/(bachiller|secundaria)/.test(text)) return 'secondary';
  return null;
}

function inferAvailabilityRequired(job) {
  if (job.availability_required) return job.availability_required;
  const text = [job.title, job.role, job.description, job.requirements].filter(Boolean).join(' ').toLowerCase();
  if (/(inmediata|immediate|asap|incorporación inmediata)/.test(text)) return 'immediate';
  if (/(30 días|30 dias|un mes)/.test(text)) return '30_days';
  return 'flexible';
}

/**
 * Enrich job payload with structured matching fields inferred from free text.
 * Safe to call before insert/update; explicit form values take precedence.
 */
export function enrichJobMatchingFields(job = {}) {
  const enriched = { ...job };

  if (!enriched.experience_level) {
    enriched.experience_level = inferJobExperienceLevel(enriched);
  }
  if (!enriched.required_skills?.length) {
    const inferred = inferRequiredSkills(enriched);
    if (inferred.length) enriched.required_skills = inferred;
  }
  if (!enriched.required_languages?.length) {
    const inferred = inferRequiredLanguages(enriched);
    if (inferred.length) enriched.required_languages = inferred;
  }
  if (!enriched.education_level) {
    enriched.education_level = inferEducationLevel(enriched);
  }
  if (!enriched.availability_required) {
    enriched.availability_required = inferAvailabilityRequired(enriched);
  }

  return enriched;
}
