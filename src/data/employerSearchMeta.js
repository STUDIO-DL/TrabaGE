/**
 * Curated search metadata for employers (companies + organizations).
 * One official record per employer — acronyms/aliases are search values only.
 *
 * @typedef {Object} EmployerSearchMeta
 * @property {string} [short_name]
 * @property {string} [acronym]
 * @property {string[]} [aliases]
 * @property {string} [provider]
 */

/** @type {Record<string, EmployerSearchMeta>} */
export const EMPLOYER_SEARCH_META = {
  'mobil-equatorial-guinea-inc-exxonmobil': {
    short_name: 'Mobil EG',
    acronym: 'MEGI',
    aliases: ['ExxonMobil', 'Exxon Mobil', 'Mobil Equatorial Guinea', 'Mobil Guinea Ecuatorial'],
  },
  'marathon-eg-production-limited-megpl': {
    short_name: 'Marathon EG',
    aliases: ['M.E.G.P.L.', 'Marathon Production', 'Marathon Oil EG', 'Marathon Guinea Ecuatorial'],
  },
  'noble-energy-equatorial-guinea': {
    short_name: 'Noble Energy',
    aliases: ['Noble Energy EG', 'Noble Guinea Ecuatorial'],
  },
  'chevron-equatorial-guinea': {
    short_name: 'Chevron EG',
    aliases: ['Chevron Guinea Ecuatorial', 'Chevron EG'],
  },
  'kosmos-energy-eg': {
    short_name: 'Kosmos',
    aliases: ['Kosmos Energy', 'Kosmos Guinea Ecuatorial'],
  },
  gepetrol: {
    short_name: 'GEPetrol',
    acronym: 'GEPETROL',
    aliases: ['GE Petrol', 'Guinea Ecuatorial Petroleos', 'Petroleos de Guinea Ecuatorial'],
  },
  'axa-seguros-guinea-ecuatorial': {
    short_name: 'AXA',
    acronym: 'AXA',
    aliases: ['AXA Seguros', 'AXA Guinea Ecuatorial'],
  },
  'getesa-orange-guinea-ecuatorial': {
    short_name: 'GETESA',
    acronym: 'GETESA',
    provider: 'Orange',
    aliases: ['Orange Guinea Ecuatorial', 'Orange EG', 'Getesa Orange'],
  },
  'ceiba-intercontinental': {
    short_name: 'CEIBA',
    acronym: 'CEIBA',
    aliases: ['Ceiba Intercontinental Airlines', 'CEIBA Airlines'],
  },
  'pwc-guinea-ecuatorial': {
    short_name: 'PwC',
    acronym: 'PWC',
    aliases: ['PricewaterhouseCoopers', 'Price Waterhouse Coopers', 'PwC EG'],
  },
  'ey-ernst-young-guinea-ecuatorial': {
    short_name: 'EY',
    acronym: 'EY',
    aliases: ['Ernst & Young', 'Ernst and Young', 'EY Guinea Ecuatorial'],
  },
  'deloitte-guinea-ecuatorial': {
    short_name: 'Deloitte',
    aliases: ['Deloitte EG', 'Deloitte Guinea'],
  },
  'kpmg-guinea-ecuatorial': {
    short_name: 'KPMG',
    acronym: 'KPMG',
    aliases: ['K.P.M.G.', 'KPMG EG'],
  },
  'asociacion-de-jovenes-tecnologicos-ajtge': {
    short_name: 'AJTGE',
    aliases: ['A.J.T.G.E.', 'Jovenes Tecnologicos', 'Asociacion de Jovenes Tecnologicos'],
  },
  'gdg-malabo-google-developer-group': {
    short_name: 'GDG Malabo',
    acronym: 'GDG',
    provider: 'Google',
    aliases: ['Google Developer Group Malabo', 'GDG Guinea Ecuatorial'],
  },
  'agencia-nacional-de-ciberseguridad-anc': {
    short_name: 'ANC',
    aliases: ['A.N.C.', 'Agencia Nacional de Ciberseguridad Guinea Ecuatorial'],
  },
  'organo-de-regulacion-de-telecomunicaciones-ortel': {
    short_name: 'ORTEL',
    aliases: ['O.R.T.E.L.', 'Organo de Regulacion de Telecomunicaciones'],
  },
  'asociacion-de-ingenieros-en-informatica-aeii': {
    short_name: 'AEII',
    aliases: ['A.E.I.I.', 'Asociacion de Ingenieros en Informatica'],
  },
  'asociacion-de-proveedores-de-internet-apsi-ge': {
    short_name: 'APSI GE',
    aliases: ['APSI', 'A.P.S.I.', 'Asociacion de Proveedores de Internet'],
  },
  'kitea-kge-sa': {
    short_name: 'Kitea',
    acronym: 'KGE',
    aliases: ['K.G.E.', 'Kitea SA', 'KGE SA'],
  },
  'grupo-agem': {
    short_name: 'AGEM',
    acronym: 'AGEM',
    aliases: ['A.G.E.M.', 'Grupo AGEM Guinea Ecuatorial'],
  },
  sec: {
    short_name: 'SEC',
    acronym: 'SEC',
    aliases: ['S.E.C.', 'S E C'],
  },
  'golden-swan-gesl': {
    short_name: 'Golden Swan',
    acronym: 'GESL',
    aliases: ['G.E.S.L.', 'Golden Swan GE'],
  },
  'guinea-ecuatorial-digital': {
    short_name: 'GE Digital',
    acronym: 'GED',
    aliases: ['GEDigital', 'Digital Guinea Ecuatorial'],
  },
  'malabo-tech-hub': {
    short_name: 'Malabo Tech',
    aliases: ['Tech Hub Malabo', 'MTH'],
  },
  'cybernet-eg': {
    short_name: 'CyberNet',
    aliases: ['Cybernet Guinea Ecuatorial', 'Cyber Net EG'],
  },
};

export default EMPLOYER_SEARCH_META;
