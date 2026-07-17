/**
 * Official educational institutions catalog for TrabaGE.
 *
 * Sourced from catalogo_instituciones_educativas_trabage.pdf
 * Countries: Guinea Ecuatorial, Camerún, Benín, Senegal, China, España.
 *
 * @typedef {'university'|'institute'|'school'|'fp'|'technical'} InstitutionType
 *
 * @typedef {Object} Institution
 * @property {string} id - Stable slug/id for the institution
 * @property {string} name - Official full name (saved to profile as-is)
 * @property {string} country
 * @property {string} city
 * @property {InstitutionType} type
 * @property {string} [verifiedId] - Future: TrabaGE verified organization account id
 * @property {string} [logoUrl] - Future: official logo when institution is verified on TrabaGE
 */

/** @type {Record<InstitutionType, string>} */
export const INSTITUTION_TYPE_LABELS = {
  university: 'Universidad',
  institute: 'Instituto',
  school: 'Colegio',
  fp: 'FP',
  technical: 'Técnico',
};

/** @type {Institution[]} */
export const INSTITUTIONS = [
  {
    id: 'universidad-de-abomey-calavi',
    name: 'Universidad de Abomey-Calavi',
    country: 'Benín',
    city: 'Abomey-Calavi',
    type: 'university',
  },
  {
    id: 'universidad-catolica-de-africa-central',
    name: 'Universidad Católica de África Central',
    country: 'Camerún',
    city: 'Yaundé',
    type: 'university',
  },
  {
    id: 'universidad-de-duala',
    name: 'Universidad de Duala',
    country: 'Camerún',
    city: 'Duala',
    type: 'university',
  },
  {
    id: 'universidad-de-yaunde-i',
    name: 'Universidad de Yaundé I',
    country: 'Camerún',
    city: 'Yaundé',
    type: 'university',
  },
  {
    id: 'universidad-de-yaunde-ii',
    name: 'Universidad de Yaundé II',
    country: 'Camerún',
    city: 'Yaundé',
    type: 'university',
  },
  {
    id: 'instituto-de-formacion-e-investigacion-demografica',
    name: 'Instituto de Formación e Investigación Demográfica',
    country: 'Camerún',
    city: 'Yaundé',
    type: 'fp',
  },
  {
    id: 'universidad-de-estudios-extranjeros-de-tianjin',
    name: 'Universidad de Estudios Extranjeros de Tianjin',
    country: 'China',
    city: 'Tianjín',
    type: 'university',
  },
  {
    id: 'universidad-de-estudios-internacionales-de-shanghai',
    name: 'Universidad de Estudios Internacionales de Shanghái',
    country: 'China',
    city: 'Shanghái',
    type: 'university',
  },
  {
    id: 'universidad-de-estudios-internacionales-de-zhejiang',
    name: 'Universidad de Estudios Internacionales de Zhejiang',
    country: 'China',
    city: 'Hangzhou',
    type: 'university',
  },
  {
    id: 'universidad-de-lengua-y-cultura-de-pekin',
    name: 'Universidad de Lengua y Cultura de Pekín',
    country: 'China',
    city: 'Pekín',
    type: 'university',
  },
  {
    id: 'universidad-complutense-de-madrid',
    name: 'Universidad Complutense de Madrid',
    country: 'España',
    city: 'Madrid',
    type: 'university',
  },
  {
    id: 'universidad-nacional-de-educacion-a-distancia',
    name: 'Universidad Nacional de Educación a Distancia',
    country: 'España',
    city: 'Madrid',
    type: 'university',
  },
  {
    id: 'universidad-de-alcala',
    name: 'Universidad de Alcalá',
    country: 'España',
    city: 'Alcalá de Henares',
    type: 'university',
  },
  {
    id: 'universidad-de-las-palmas-de-gran-canaria',
    name: 'Universidad de Las Palmas de Gran Canaria',
    country: 'España',
    city: 'Las Palmas de Gran Canaria',
    type: 'university',
  },
  {
    id: 'bange-business-school-en-alianza-con-el-centro-de-estudios-financieros-universidad-a-distancia-de-madrid',
    name: 'BANGE Business School (en alianza con el Centro de Estudios Financieros — Universidad a Distancia de Madrid)',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'university',
  },
  {
    id: 'escuela-complutense-africana-universidad-complutense-de-madrid',
    name: 'Escuela Complutense Africana (Universidad Complutense de Madrid)',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'university',
  },
  {
    id: 'fundacion-universitaria-iberoamericana-funiber-en-alianza-con-universidad-europea-del-atlantico',
    name: 'Fundación Universitaria Iberoamericana — FUNIBER (en alianza con Universidad Europea del Atlántico)',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'university',
  },
  {
    id: 'universidad-afro-americana-de-africa-central',
    name: 'Universidad Afro-Americana de África Central',
    country: 'Guinea Ecuatorial',
    city: 'Ciudad de la Paz (Oyala)',
    type: 'university',
  },
  {
    id: 'universidad-nacional-de-educacion-a-distancia-centro-asociado-de-guinea-ecuatorial',
    name: 'Universidad Nacional de Educación a Distancia — Centro Asociado de Guinea Ecuatorial',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'university',
  },
  {
    id: 'universidad-nacional-de-guinea-ecuatorial',
    name: 'Universidad Nacional de Guinea Ecuatorial',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'university',
  },
  {
    id: 'centro-de-estudios-vitae',
    name: 'Centro de Estudios Vitae',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'fp',
  },
  {
    id: 'centro-de-formacion-profesional-de-bata',
    name: 'Centro de Formación Profesional de Bata',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'fp',
  },
  {
    id: 'instituto-nacional-de-formacion-profesional',
    name: 'Instituto Nacional de Formación Profesional',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'fp',
  },
  {
    id: 'instituto-nacional-de-formacion-profesional-en-hosteleria-turismo-artes-y-oficios-de-mongomo',
    name: 'Instituto Nacional de Formación Profesional en Hostelería, Turismo, Artes y Oficios de Mongomo',
    country: 'Guinea Ecuatorial',
    city: 'Mongomo',
    type: 'fp',
  },
  {
    id: 'instituto-nostradamus-de-formacion-tecnica-y-profesional',
    name: 'Instituto Nostradamus de Formación Técnica y Profesional',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'fp',
  },
  {
    id: 'escuela-nacional-de-electricidad-de-guinea-ecuatorial',
    name: 'Escuela Nacional de Electricidad de Guinea Ecuatorial',
    country: 'Guinea Ecuatorial',
    city: 'Ciudad de la Paz (Oyala)',
    type: 'technical',
  },
  {
    id: 'instituto-nacional-de-administracion-publica',
    name: 'Instituto Nacional de Administración Pública',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'technical',
  },
  {
    id: 'instituto-tecnologico-nacional-de-hidrocarburos-de-guinea-ecuatorial',
    name: 'Instituto Tecnológico Nacional de Hidrocarburos de Guinea Ecuatorial',
    country: 'Guinea Ecuatorial',
    city: 'Ciudad de la Paz (Oyala)',
    type: 'technical',
  },
  {
    id: 'colegio-nacional-enrique-nvo-okenve',
    name: 'Colegio Nacional Enrique Nvó Okenve',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'institute',
  },
  {
    id: 'instituto-bioko-norte',
    name: 'Instituto Bioko Norte',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'institute',
  },
  {
    id: 'instituto-padre-sialo',
    name: 'Instituto Padre Sialó',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'institute',
  },
  {
    id: 'instituto-politecnico-modesto-gene',
    name: 'Instituto Politécnico Modesto Gené',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'institute',
  },
  {
    id: 'instituto-de-ensenanza-secundaria-rey-malabo',
    name: 'Instituto de Enseñanza Secundaria Rey Malabo',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'institute',
  },
  {
    id: 'instituto-africa-piloto',
    name: 'Instituto África Piloto',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'institute',
  },
  {
    id: 'colegio-calasanz',
    name: 'Colegio Calasanz',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'school',
  },
  {
    id: 'colegio-claret',
    name: 'Colegio Claret',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'school',
  },
  {
    id: 'colegio-diocesano-rafael-m-nze-abuy',
    name: 'Colegio Diocesano Rafael M. Nze Abuy',
    country: 'Guinea Ecuatorial',
    city: 'Ebibeyín',
    type: 'school',
  },
  {
    id: 'colegio-ewaiso-ipola',
    name: 'Colegio E\'Waiso Ipola',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'school',
  },
  {
    id: 'colegio-espanol-don-bosco-de-malabo',
    name: 'Colegio Español Don Bosco de Malabo',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'school',
  },
  {
    id: 'colegio-espanol-de-bata',
    name: 'Colegio Español de Bata',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'school',
  },
  {
    id: 'colegio-internacional-de-guinea-ecuatorial',
    name: 'Colegio Internacional de Guinea Ecuatorial',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'school',
  },
  {
    id: 'colegio-la-salle',
    name: 'Colegio La Salle',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'school',
  },
  {
    id: 'colegio-madre-catalina',
    name: 'Colegio Madre Catalina',
    country: 'Guinea Ecuatorial',
    city: 'Bata',
    type: 'school',
  },
  {
    id: 'colegio-santa-teresita',
    name: 'Colegio Santa Teresita',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'school',
  },
  {
    id: 'colegio-virgen-del-carmen',
    name: 'Colegio Virgen del Carmen',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'school',
  },
  {
    id: 'royal-international-college',
    name: 'Royal International College',
    country: 'Guinea Ecuatorial',
    city: 'Malabo',
    type: 'school',
  },
  {
    id: 'universidad-cheikh-anta-diop-de-dakar',
    name: 'Universidad Cheikh Anta Diop de Dakar',
    country: 'Senegal',
    city: 'Dakar',
    type: 'university',
  },
];

export default INSTITUTIONS;
