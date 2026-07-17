export const HEADLINE_MAX_LENGTH = 220;

export function getCurrentExperience(experience = []) {
  if (!experience?.length) return null;

  const sorted = [...experience].sort((a, b) => {
    const aCurrent = !a.end_date;
    const bCurrent = !b.end_date;
    if (aCurrent && !bCurrent) return -1;
    if (!aCurrent && bCurrent) return 1;
    const aDate = a.end_date || a.start_date || '';
    const bDate = b.end_date || b.start_date || '';
    return bDate.localeCompare(aDate);
  });

  return sorted[0];
}

export function formatCurrentPosition(experienceItem) {
  if (!experienceItem) return null;
  const company = experienceItem.company?.trim();
  const position = experienceItem.position?.trim();
  if (company && position) return `${company} · ${position}`;
  return company || position || null;
}

export function formatEducationIntroLine(educationItem) {
  if (!educationItem?.institution?.trim()) return null;

  const parts = [educationItem.institution.trim()];
  if (educationItem.program?.trim()) parts.push(educationItem.program.trim());
  return parts.join(' · ');
}

export function getIntroEducationItem(profile) {
  if (!profile?.show_education_in_intro) return null;

  const education = profile?.education ?? [];
  if (profile?.intro_education_id) {
    const introId = String(profile.intro_education_id);
    const selected = education.find((item) => String(item.id) === introId);
    if (selected) return selected;
  }

  return null;
}

export function getIntroEducationLine(profile) {
  return formatEducationIntroLine(getIntroEducationItem(profile));
}

export function formatLocation(profile) {
  const parts = [profile?.city, profile?.country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return null;
}

export function buildEducationSelectOptions(education = []) {
  return [
    { value: '', label: 'Seleccionar centro' },
    ...education.map((item) => ({
      value: item.id,
      label: formatEducationIntroLine(item) || item.institution || 'Centro educativo',
    })),
  ];
}

export function validateIntroForm(form) {
  const errors = {};

  if (!form.full_name?.trim()) {
    errors.full_name = 'El nombre es obligatorio.';
  }

  if (!form.headline?.trim()) {
    errors.headline = 'El titular profesional es obligatorio.';
  } else if (form.headline.trim().length > HEADLINE_MAX_LENGTH) {
    errors.headline = `Máximo ${HEADLINE_MAX_LENGTH} caracteres.`;
  }

  if (!form.sector?.trim()) {
    errors.sector = 'El sector es obligatorio.';
  }

  if (!form.country?.trim()) {
    errors.country = 'El país es obligatorio.';
  }

  if (!form.city?.trim()) {
    errors.city = 'La ciudad es obligatoria.';
  }

  if (form.show_education_in_intro && !form.intro_education_id) {
    errors.intro_education_id = 'Selecciona un centro educativo o desactiva la opción.';
  }

  return errors;
}
