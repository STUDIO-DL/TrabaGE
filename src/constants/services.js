/** Common freelance / professional services for autocomplete suggestions */
export const SERVICE_SUGGESTIONS = [
  'Desarrollo web',
  'Diseño gráfico',
  'Diseño de logos',
  'Consultoría empresarial',
  'Contabilidad',
  'Asesoría fiscal',
  'Traducción',
  'Redacción de contenidos',
  'Community management',
  'Marketing digital',
  'Fotografía',
  'Videografía',
  'Edición de video',
  'Clases particulares',
  'Tutorías',
  'Reparación de ordenadores',
  'Mantenimiento informático',
  'Instalación eléctrica',
  'Fontanería',
  'Carpintería',
  'Pintura',
  'Limpieza',
  'Jardinería',
  'Mensajería',
  'Transporte',
  'Eventos',
  'Catering',
  'Pastelería',
  'Peluquería',
  'Manicura',
  'Masajes',
  'Entrenamiento personal',
  'Asesoría legal',
  'Recursos humanos',
  'Selección de personal',
  'Auditoría',
  'Control de calidad',
  'Logística',
  'Almacenamiento',
  'Importación y exportación',
];

export function filterServiceSuggestions(query, existingNames = [], limit = 8) {
  const q = query.trim().toLowerCase();
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  return SERVICE_SUGGESTIONS.filter((service) => {
    if (taken.has(service.toLowerCase())) return false;
    if (!q) return true;
    return service.toLowerCase().includes(q);
  }).slice(0, limit);
}
