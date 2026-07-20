const EDIT_INTRO_PATH = '/personal/profile/edit-intro';

const CHECKS = [
  {
    key: 'avatar',
    label: 'Foto de perfil',
    target: EDIT_INTRO_PATH,
    isMissing: (profile) => !profile?.avatar_path?.trim(),
  },
  {
    key: 'headline',
    label: 'Titular profesional',
    target: EDIT_INTRO_PATH,
    isMissing: (profile) => !profile?.headline?.trim(),
  },
  {
    key: 'about',
    label: 'Sobre mí',
    target: '#about',
    isMissing: (profile) => !profile?.about?.trim(),
  },
  {
    key: 'experience',
    label: 'Experiencia profesional',
    target: '#experience',
    isMissing: (profile) => !(profile?.experience?.length >= 1),
  },
  {
    key: 'education',
    label: 'Formación académica',
    target: '#education',
    isMissing: (profile) => !(profile?.education?.length >= 1),
  },
  {
    key: 'skills',
    label: 'Habilidades',
    target: '#skills',
    isMissing: (profile) => !(profile?.skills?.length >= 1),
  },
  {
    key: 'city',
    label: 'Ciudad',
    target: EDIT_INTRO_PATH,
    isMissing: (profile) => !profile?.city?.trim(),
  },
];

/**
 * Returns whether the profile has the minimum data required to generate a professional CV.
 * @param {object|null|undefined} profile
 * @returns {{ ready: boolean, missing: Array<{ key: string, label: string, target: string }> }}
 */
export function getCvReadiness(profile) {
  const missing = CHECKS.filter((check) => check.isMissing(profile)).map(({ key, label, target }) => ({
    key,
    label,
    target,
  }));

  return {
    ready: missing.length === 0,
    missing,
  };
}

/**
 * Navigate or scroll to the first incomplete CV section.
 * @param {string} target - route path or `#sectionId`
 * @param {(path: string) => void} navigate - react-router navigate
 */
export function goToCvReadinessTarget(target, navigate) {
  if (!target) return;

  if (target.startsWith('#')) {
    const el = document.getElementById(target.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate?.('/personal/profile');
    return;
  }

  navigate?.(target);
}
