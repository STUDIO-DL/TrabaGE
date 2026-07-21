/** Predefined languages for profile selection and future search filters. */
export const PROFILE_LANGUAGES = [
  { value: 'Español', label: 'Español' },
  { value: 'Inglés', label: 'Inglés' },
  { value: 'Francés', label: 'Francés' },
  { value: 'Portugués', label: 'Portugués' },
  { value: 'Fang', label: 'Fang' },
  { value: 'Bubi', label: 'Bubi' },
  { value: 'Ndowé', label: 'Ndowé' },
  { value: 'Annobonés', label: 'Annobonés' },
];

export const PROFILE_LANGUAGE_OPTIONS = PROFILE_LANGUAGES.map(({ value, label }) => ({
  value,
  label,
}));
