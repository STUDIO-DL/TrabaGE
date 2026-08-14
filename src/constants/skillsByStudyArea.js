export const SKILLS_BY_STUDY_AREA = {
  Informática: ['Programación', 'JavaScript', 'Python', 'Bases de datos', 'Git', 'Desarrollo web'],
  Administración: ['Gestión', 'Organización', 'Excel', 'Contabilidad', 'Atención al cliente'],
  Economía: ['Análisis de datos', 'Finanzas', 'Estadística', 'Excel'],
  Derecho: ['Investigación jurídica', 'Redacción legal', 'Asesoría legal'],
  Ingeniería: ['Mecánica', 'Matemáticas', 'Dibujo técnico', 'CAD'],
  Salud: ['Enfermería', 'Atención al paciente', 'Primeros auxilios'],
  Educación: ['Docencia', 'Pedagogía', 'Planificación curricular'],
  Comunicación: ['Redacción', 'Comunicación', 'Marketing digital', 'Redes sociales'],
  Arquitectura: ['Dibujo técnico', 'AutoCAD', 'Diseño'],
  Ciencias: ['Investigación', 'Análisis de datos', 'Laboratorio'],
  'Arte y Diseño': ['Diseño gráfico', 'Fotografía', 'Edición de video'],
  Hostelería: ['Cocina', 'Atención al cliente', 'Servicio'],
  Finanzas: ['Contabilidad', 'Gestión financiera', 'Excel'],
};

export function getSkillsForStudyArea(area = '') {
  return SKILLS_BY_STUDY_AREA[area] || [];
}
