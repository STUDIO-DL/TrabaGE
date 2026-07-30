/**
 * Curated search metadata for educational institutions.
 * One official record per institution — these are search values only (never duplicate rows).
 *
 * Acronyms already present in official names as "(SIGLA)" are auto-extracted at enrich time;
 * list here only overrides / extras that are not in the name.
 *
 * @typedef {Object} InstitutionSearchMeta
 * @property {string} [short_name]
 * @property {string} [acronym]
 * @property {string[]} [aliases]
 * @property {string} [provider]
 */

/** @type {Record<string, InstitutionSearchMeta>} */
export const INSTITUTION_SEARCH_META = {
  'universidad-nacional-de-guinea-ecuatorial': {
    short_name: 'Universidad Nacional',
    acronym: 'UNGE',
    aliases: [
      'U.N.G.E.',
      'Universidad Nacional Guinea Ecuatorial',
      'UNGE Guinea Ecuatorial',
      'Universidad Nacional de Guinea Ecuatorial UNGE',
    ],
  },
  'universidad-nacional-de-educacion-a-distancia-centro-asociado-de-guinea-ecuatorial': {
    short_name: 'UNED Guinea Ecuatorial',
    acronym: 'UNED',
    aliases: [
      'U.N.E.D.',
      'UNED Centro Asociado Guinea Ecuatorial',
      'Universidad Nacional de Educacion a Distancia',
      'Universidad a Distancia Guinea Ecuatorial',
    ],
  },
  'universidad-afro-americana-de-africa-central': {
    short_name: 'Universidad Afro-Americana',
    acronym: 'AAAC',
    aliases: [
      'A.A.A.C.',
      'Universidad Afroamericana de Africa Central',
      'Universidad Afro Americana de Africa Central',
      'AAAC Oyala',
    ],
  },
  'universidad-cardenal-herrera-okenve': {
    short_name: 'Cardenal Herrera Okenve',
    acronym: 'UCHO',
    aliases: ['Universidad Cardenal Herrera', 'UCH Okenve'],
  },
  'fundacion-universitaria-iberoamericana-funiber-en-alianza-con-universidad-europea-del-atlantico': {
    short_name: 'FUNIBER',
    acronym: 'FUNIBER',
    provider: 'Universidad Europea del Atlántico',
    aliases: [
      'Fundacion Universitaria Iberoamericana',
      'FUNIBER Guinea Ecuatorial',
      'FUNIBER Malabo',
    ],
  },
  'bange-business-school-en-alianza-con-el-centro-de-estudios-financieros-universidad-a-distancia-de-madrid': {
    short_name: 'BANGE Business School',
    acronym: 'BANGE',
    provider: 'Centro de Estudios Financieros — UDIMA',
    aliases: ['BANGE School', 'Business School BANGE', 'UDIMA Guinea Ecuatorial'],
  },
  'escuela-complutense-africana-universidad-complutense-de-madrid': {
    short_name: 'Escuela Complutense Africana',
    acronym: 'ECA',
    provider: 'Universidad Complutense de Madrid',
    aliases: ['Complutense Africana', 'UCM Guinea Ecuatorial', 'Escuela Complutense'],
  },
  'instituto-tecnologico-de-guinea-ecuatorial-itge': {
    short_name: 'Instituto Tecnológico',
    // acronym ITGE extracted from name; aliases reinforce search
    aliases: ['I.T.G.E.', 'ITGE Guinea Ecuatorial', 'Instituto Tecnologico Guinea Ecuatorial'],
  },
  'instituto-tecnologico-nacional-de-hidrocarburos-de-guinea-ecuatorial': {
    short_name: 'Instituto de Hidrocarburos',
    acronym: 'ITNHGE',
    aliases: [
      'I.T.N.H.G.E.',
      'Instituto Tecnologico Nacional de Hidrocarburos',
      'ITNH Guinea Ecuatorial',
      'Escuela de Hidrocarburos',
    ],
  },
  'escuela-nacional-de-electricidad-de-guinea-ecuatorial': {
    short_name: 'Escuela de Electricidad',
    acronym: 'ENEGE',
    aliases: ['E.N.E.G.E.', 'Escuela Nacional de Electricidad', 'ENE Guinea Ecuatorial'],
  },
  'instituto-nacional-de-formacion-profesional': {
    short_name: 'INFP',
    acronym: 'INFP',
    aliases: ['I.N.F.P.', 'Instituto Nacional de Formacion Profesional Malabo'],
  },
  'instituto-nacional-de-administracion-publica': {
    short_name: 'INAP',
    acronym: 'INAP',
    aliases: ['I.N.A.P.', 'Instituto Nacional de Administracion Publica Guinea Ecuatorial'],
  },
  'instituto-ecuatoguineano-de-administracion-igae': {
    short_name: 'IGAE',
    aliases: ['I.G.A.E.', 'Instituto Ecuatoguineano de Administracion'],
  },
  'colegio-espanol-de-malabo-cem': {
    short_name: 'Colegio Español Malabo',
    aliases: ['C.E.M.', 'Colegio Espanol de Malabo'],
  },
  'instituto-de-ciencias-de-la-educacion-ice': {
    short_name: 'ICE',
    aliases: ['I.C.E.', 'Instituto de Ciencias de la Educacion'],
  },
  'instituto-politecnico-de-malabo': {
    short_name: 'Politécnico de Malabo',
    acronym: 'IPM',
    aliases: ['I.P.M.', 'Politecnico Malabo', 'Instituto Politecnico Malabo'],
  },
  'instituto-politecnico-de-bata': {
    short_name: 'Politécnico de Bata',
    acronym: 'IPB',
    aliases: ['I.P.B.', 'Politecnico Bata', 'Instituto Politecnico Bata'],
  },
  'instituto-politecnico-modesto-gene': {
    short_name: 'Politécnico Modesto Gené',
    aliases: ['Instituto Politecnico Modesto Gene', 'Modesto Gene'],
  },
  'universidad-de-yaunde-i': {
    short_name: 'Yaoundé I',
    acronym: 'UYI',
    aliases: ['Universidad de Yaounde I', 'University of Yaounde I', 'Yaunde 1'],
  },
  'universidad-de-yaunde-ii': {
    short_name: 'Yaoundé II',
    acronym: 'UYII',
    aliases: ['Universidad de Yaounde II', 'University of Yaounde II', 'Yaunde 2'],
  },
  'universidad-catolica-de-africa-central': {
    short_name: 'UCAC',
    acronym: 'UCAC',
    aliases: ['U.C.A.C.', 'Universidad Catolica de Africa Central', 'Catholic University of Central Africa'],
  },
  'universidad-de-duala': {
    short_name: 'Universidad de Duala',
    acronym: 'UD',
    aliases: ['University of Douala', 'Universidad de Douala'],
  },
  'universidad-de-abomey-calavi': {
    short_name: 'Abomey-Calavi',
    acronym: 'UAC',
    aliases: ['U.A.C.', 'University of Abomey Calavi', 'Universite d Abomey Calavi'],
  },
  'universidad-cheikh-anta-diop-de-dakar': {
    short_name: 'Cheikh Anta Diop',
    acronym: 'UCAD',
    aliases: ['U.C.A.D.', 'Universidad Cheikh Anta Diop', 'University of Dakar'],
  },
  'universidad-complutense-de-madrid': {
    short_name: 'Complutense',
    acronym: 'UCM',
    aliases: ['U.C.M.', 'Universidad Complutense'],
  },
  'universidad-nacional-de-educacion-a-distancia': {
    short_name: 'UNED',
    acronym: 'UNED',
    aliases: ['U.N.E.D.', 'Universidad a Distancia'],
  },
  'universidad-de-las-palmas-de-gran-canaria': {
    short_name: 'ULPGC',
    acronym: 'ULPGC',
    aliases: ['U.L.P.G.C.', 'Universidad de Las Palmas'],
  },
  'colegio-internacional-de-guinea-ecuatorial': {
    short_name: 'Colegio Internacional',
    acronym: 'CIGE',
    aliases: ['C.I.G.E.', 'International School Guinea Ecuatorial'],
  },
  'royal-international-college': {
    short_name: 'Royal International',
    acronym: 'RIC',
    aliases: ['R.I.C.', 'Royal College Malabo'],
  },
};

export default INSTITUTION_SEARCH_META;
