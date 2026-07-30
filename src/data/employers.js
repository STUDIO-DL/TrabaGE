import { EMPLOYER_SEARCH_META } from './employerSearchMeta';
import { enrichCatalogEntry } from '../utils/catalogSearch';

/**
 * Professional employers catalog for TrabaGE (companies + organizations).
 * Names only — no phones, emails, cities, or sectors stored here.
 *
 * Search fields (short_name, acronym, aliases, provider) enrich a single official
 * record — never duplicate employers for alternate spellings/siglas.
 *
 * @typedef {'company'|'organization'} EmployerOrganizationType
 *
 * @typedef {Object} Employer
 * @property {string} id
 * @property {string} name
 * @property {EmployerOrganizationType} organizationType
 * @property {string} [short_name]
 * @property {string} [acronym]
 * @property {string[]} [aliases]
 * @property {string} [provider]
 */

/** @type {Employer[]} */
const RAW_EMPLOYERS = [
  { id: 'mobil-equatorial-guinea-inc-exxonmobil', name: 'Mobil Equatorial Guinea Inc. (ExxonMobil)', organizationType: 'company' },
  { id: 'marathon-eg-production-limited-megpl', name: 'Marathon E.G. Production Limited (MEGPL)', organizationType: 'company' },
  { id: 'noble-energy-equatorial-guinea', name: 'Noble Energy Equatorial Guinea', organizationType: 'company' },
  { id: 'chevron-equatorial-guinea', name: 'Chevron Equatorial Guinea', organizationType: 'company' },
  { id: 'kosmos-energy-eg', name: 'Kosmos Energy EG', organizationType: 'company' },
  { id: 'gepetrol', name: 'Gepetrol', organizationType: 'company' },
  { id: 'axa-seguros-guinea-ecuatorial', name: 'AXA Seguros Guinea Ecuatorial', organizationType: 'company' },
  { id: 'getesa-orange-guinea-ecuatorial', name: 'Getesa (Orange Guinea Ecuatorial)', organizationType: 'company' },
  { id: 'datatech-malabo', name: 'Datatech Malabo', organizationType: 'company' },
  { id: 'cybernet-eg', name: 'CyberNet EG', organizationType: 'company' },
  { id: 'guinness-tech', name: 'Guinness Tech', organizationType: 'company' },
  { id: 'tecnomalabo', name: 'TecnoMalabo', organizationType: 'company' },
  { id: 'ceiba-intercontinental', name: 'CEIBA Intercontinental', organizationType: 'company' },
  { id: 'cronos-airlines', name: 'Cronos Airlines', organizationType: 'company' },
  { id: 'hotel-sofitel-malabo-presidente-palace', name: 'Hotel Sofitel Malabo Presidente Palace', organizationType: 'company' },
  { id: 'grand-hotel-djibloho', name: 'Grand Hotel Djibloho', organizationType: 'company' },
  { id: 'ibis-malabo', name: 'Ibis Malabo', organizationType: 'company' },
  { id: 'colonial-kudi-hotel', name: 'Colonial Kudi Hotel', organizationType: 'company' },
  { id: 'supermercados-martinez', name: 'Supermercados Martinez', organizationType: 'company' },
  { id: 'eg-food-service', name: 'EG Food Service', organizationType: 'company' },
  { id: 'comercial-el-pilon', name: 'Comercial El Pilon', organizationType: 'company' },
  { id: 'panaderia-la-espanola-malabo', name: 'Panadería La Española Malabo', organizationType: 'company' },
  { id: 'pwc-guinea-ecuatorial', name: 'PwC Guinea Ecuatorial', organizationType: 'company' },
  { id: 'ey-ernst-young-guinea-ecuatorial', name: 'EY (Ernst & Young) Guinea Ecuatorial', organizationType: 'company' },
  { id: 'deloitte-guinea-ecuatorial', name: 'Deloitte Guinea Ecuatorial', organizationType: 'company' },
  { id: 'kpmg-guinea-ecuatorial', name: 'KPMG Guinea Ecuatorial', organizationType: 'company' },
  { id: 'fiducia-consultores', name: 'Fiducia Consultores', organizationType: 'company' },
  { id: 'lex-co-abogados', name: 'Lex & Co. Abogados', organizationType: 'company' },
  { id: 'legalia-guinea-ecuatorial', name: 'Legalia Guinea Ecuatorial', organizationType: 'company' },
  { id: 'grupo-consultor-equatorial', name: 'Grupo Consultor Equatorial', organizationType: 'company' },
  { id: 'global-solutions-eg', name: 'Global Solutions EG', organizationType: 'company' },
  { id: 'clinica-la-paz-malabo', name: 'Clinica La Paz Malabo', organizationType: 'company' },
  { id: 'inmobiliaria-malabo-homes', name: 'Inmobiliaria Malabo Homes', organizationType: 'company' },
  { id: 'publicidad-plus-malabo', name: 'Publicidad Plus Malabo', organizationType: 'company' },
  { id: 'graficas-ecuatorial', name: 'Graficas Ecuatorial', organizationType: 'company' },
  { id: 'pyc-automocion-concesionario', name: 'PyC Automoción (Concesionario)', organizationType: 'company' },
  { id: 'sogecar-automocion', name: 'Sogecar Automoción', organizationType: 'company' },
  { id: 'metalisteria-guineana', name: 'Metalistería Guineana', organizationType: 'company' },
  { id: 'madaderas-del-golfo', name: 'Madaderas del Golfo', organizationType: 'company' },
  { id: 'agencia-de-viajes-kora', name: 'Agencia de Viajes Kora', organizationType: 'company' },
  { id: 'medios-de-comunicacion-asonga', name: 'Medios de Comunicación Asonga', organizationType: 'company' },
  { id: 'genesis-tech-sl', name: 'Genesis Tech SL', organizationType: 'company' },
  { id: 'caba-markt', name: 'Caba Markt', organizationType: 'company' },
  { id: 'ventage-group', name: 'Ventage Group', organizationType: 'company' },
  { id: 'vertex-soluciones-sl', name: 'Vertex Soluciones S.L.', organizationType: 'company' },
  { id: 'duglas-alliance-ltd', name: 'Duglas Alliance Ltd', organizationType: 'company' },
  { id: 'kitea-kge-sa', name: 'Kitea (KGE SA)', organizationType: 'company' },
  { id: 'comercial-roman-garcia', name: 'Comercial Roman Garcia', organizationType: 'company' },
  { id: 'solfage-sl', name: 'Solfage SL', organizationType: 'company' },
  { id: 'la-sabrosa-market', name: 'La Sabrosa Market', organizationType: 'company' },
  { id: 'calzadosjosetineg', name: 'CalzadosJoseTInEG', organizationType: 'company' },
  { id: 'egba-sport-wear', name: 'EGBA Sport Wear', organizationType: 'company' },
  { id: 'biitop-guinea-ecuatorial', name: 'Biitop Guinea Ecuatorial', organizationType: 'company' },
  { id: 'franquicias-carlin', name: 'Franquicias Carlin', organizationType: 'company' },
  { id: 'impeesa-ingenieria-sa', name: 'Impeesa Ingenieria S.A.', organizationType: 'company' },
  { id: 'grupo-agem', name: 'Grupo AGEM', organizationType: 'company' },
  { id: 'don-luis-tdl-sa', name: 'Don Luis TDL SA', organizationType: 'company' },
  { id: 'sec', name: 'S.E.C', organizationType: 'company' },
  { id: 'golden-swan-gesl', name: 'Golden Swan G.E.S.L', organizationType: 'company' },
  { id: 'benchmark-investments-eg', name: 'Benchmark Investments EG', organizationType: 'company' },
  { id: 'folder', name: 'Folder', organizationType: 'company' },
  { id: 'guinea-ecuatorial-digital', name: 'Guinea Ecuatorial Digital', organizationType: 'organization' },
  { id: 'malabo-tech-hub', name: 'Malabo Tech Hub', organizationType: 'organization' },
  { id: 'bata-tech-center', name: 'Bata Tech Center', organizationType: 'organization' },
  { id: 'asociacion-de-jovenes-tecnologicos-ajtge', name: 'Asociación de Jóvenes Tecnológicos (AJTGE)', organizationType: 'organization' },
  { id: 'gdg-malabo-google-developer-group', name: 'GDG Malabo (Google Developer Group)', organizationType: 'organization' },
  { id: 'python-guinea-ecuatorial', name: 'Python Guinea Ecuatorial', organizationType: 'organization' },
  { id: 'agencia-nacional-de-ciberseguridad-anc', name: 'Agencia Nacional de Ciberseguridad (ANC)', organizationType: 'organization' },
  { id: 'organo-de-regulacion-de-telecomunicaciones-ortel', name: 'Órgano de Regulación de Telecomunicaciones (ORTEL)', organizationType: 'organization' },
  { id: 'innova-guinea-ecuatorial', name: 'Innova Guinea Ecuatorial', organizationType: 'organization' },
  { id: 'bata-innovation-lab', name: 'Bata Innovation Lab', organizationType: 'organization' },
  { id: 'comunidad-open-source-eg', name: 'Comunidad Open Source EG', organizationType: 'organization' },
  { id: 'smart-city-malabo-initiative', name: 'Smart City Malabo Initiative', organizationType: 'organization' },
  { id: 'asociacion-de-ingenieros-en-informatica-aeii', name: 'Asociación de Ingenieros en Informática (AEII)', organizationType: 'organization' },
  { id: 'women-in-tech-guinea-ecuatorial', name: 'Women in Tech Guinea Ecuatorial', organizationType: 'organization' },
  { id: 'ecuatorial-data-ai-hub', name: 'Ecuatorial Data & AI Hub', organizationType: 'organization' },
  { id: 'tech-founders-malabo', name: 'Tech Founders Malabo', organizationType: 'organization' },
  { id: 'cybersecurity-guinea-ecuatorial', name: 'Cybersecurity Guinea Ecuatorial', organizationType: 'organization' },
  { id: 'e-government-guinea-ecuatorial-project', name: 'E-Government Guinea Ecuatorial Project', organizationType: 'organization' },
  { id: 'red-de-investigacion-cientifica-y-tecnologica', name: 'Red de Investigación Científica y Tecnológica', organizationType: 'organization' },
  { id: 'asociacion-de-proveedores-de-internet-apsi-ge', name: 'Asociación de Proveedores de Internet (APSI GE)', organizationType: 'organization' },
];

/** @type {Employer[]} */
export const EMPLOYERS = RAW_EMPLOYERS.map((entry) =>
  enrichCatalogEntry(entry, EMPLOYER_SEARCH_META[entry.id]),
);

export default EMPLOYERS;
