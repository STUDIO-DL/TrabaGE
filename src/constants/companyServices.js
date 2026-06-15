/** Common B2B / corporate services for company profile autocomplete */
export const COMPANY_SERVICE_SUGGESTIONS = [
  'Consultoría empresarial',
  'Asesoría fiscal',
  'Contabilidad',
  'Auditoría',
  'Recursos humanos',
  'Selección de personal',
  'Formación corporativa',
  'Desarrollo de software',
  'Desarrollo web',
  'Marketing digital',
  'Diseño gráfico',
  'Branding',
  'Logística',
  'Transporte',
  'Almacenamiento',
  'Importación y exportación',
  'Mantenimiento industrial',
  'Instalaciones eléctricas',
  'Construcción',
  'Arquitectura',
  'Ingeniería civil',
  'Seguridad privada',
  'Limpieza industrial',
  'Catering empresarial',
  'Eventos corporativos',
  'Traducción e interpretación',
  'Asesoría legal',
  'Seguros',
  'Telecomunicaciones',
  'Soporte IT',
  'Cloud y hosting',
  'Control de calidad',
  'Investigación de mercado',
  'Publicidad',
  'Community management',
];

export const CONTACT_ROLE_SUGGESTIONS = [
  'RR.HH.',
  'Representante comercial',
  'Director/a',
  'Atención al cliente',
  'Recepción',
  'Talento y cultura',
];

export function filterCompanyServiceSuggestions(query, existingNames = [], limit = 8) {
  const q = query.trim().toLowerCase();
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  return COMPANY_SERVICE_SUGGESTIONS.filter((service) => {
    if (taken.has(service.toLowerCase())) return false;
    if (!q) return true;
    return service.toLowerCase().includes(q);
  }).slice(0, limit);
}
