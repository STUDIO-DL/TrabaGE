import { normalizeSkillName } from '../utils/normalizeSkill';

/** Common professional skills for autocomplete suggestions */
export const SKILL_SUGGESTIONS = [
  'Atención al cliente',
  'Ventas',
  'Marketing digital',
  'Redes sociales',
  'Comunicación',
  'Trabajo en equipo',
  'Liderazgo',
  'Gestión de proyectos',
  'Organización',
  'Resolución de problemas',
  'Negociación',
  'Microsoft Excel',
  'Microsoft Word',
  'Microsoft PowerPoint',
  'Google Workspace',
  'Contabilidad',
  'Finanzas',
  'Administración',
  'Recursos humanos',
  'Logística',
  'Almacén',
  'Compras',
  'Atención telefónica',
  'Recepción',
  'Secretaría',
  'Traducción',
  'Redacción',
  'Diseño gráfico',
  'Fotografía',
  'Edición de video',
  'Desarrollo web',
  'JavaScript',
  'React',
  'Python',
  'SQL',
  'HTML y CSS',
  'WordPress',
  'Mantenimiento informático',
  'Electricidad',
  'Fontanería',
  'Carpintería',
  'Mecánica',
  'Conducción',
  'Operación de maquinaria',
  'Seguridad industrial',
  'Primeros auxilios',
  'Enfermería',
  'Farmacia',
  'Docencia',
  'Pedagogía',
  'Investigación',
  'Análisis de datos',
  'Inglés',
  'Francés',
  'Portugués',
  'Español',
  'Cocina',
  'Hostelería',
  'Barismo',
  'Limpieza profesional',
  'Jardinería',
  'Construcción',
  'Arquitectura',
  'Derecho',
  'Auditoría',
  'Control de calidad',
  'ISO 9001',
];

export function filterSkillSuggestions(query, existingNames = [], limit = 8) {
  const q = query.trim().toLowerCase();
  const taken = new Set(existingNames.map((n) => normalizeSkillName(n).toLowerCase()));

  return SKILL_SUGGESTIONS.filter((skill) => {
    if (taken.has(skill.toLowerCase())) return false;
    if (!q) return true;
    return skill.toLowerCase().includes(q);
  }).slice(0, limit);
}
