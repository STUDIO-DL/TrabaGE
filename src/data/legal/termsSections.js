import { SUPPORT_EMAIL } from '../../constants/support';

/** Términos y Condiciones de Uso — TrabaGE v2.1 (formato Q&A) */

export const TERMS_INTRO = {
  part: '',
  title: 'Términos y Condiciones de Uso',
  subtitle:
    'Condiciones claras para usar TrabaGE con cuenta personal, Business u Organización. Léelas con calma: definen cómo funciona la comunidad.',
};

export const TERMS_ARTICLES = [
  {
    id: 'que-es-trabage',
    title: '¿Qué es TrabaGE?',
    blocks: [
      {
        type: 'p',
        text: 'TrabaGE es una plataforma digital de empleo y oportunidades profesionales que conecta talento con Business y Organizaciones. Opera como marketplace laboral: facilita perfiles, ofertas, postulaciones, feed de contenido profesional, follows y networking, sin intervenir en la contratación final.',
      },
      {
        type: 'p',
        text: 'Está disponible como aplicación web, PWA y, cuando proceda, como app móvil. Su foco inicial es Guinea Ecuatorial, con posibilidad de expansión a otros territorios.',
      },
    ],
  },
  {
    id: 'quien-puede-utilizar',
    title: '¿Quién puede utilizar TrabaGE?',
    blocks: [
      {
        type: 'p',
        text: 'Pueden registrarse personas mayores de 18 años (o la mayoría de edad aplicable en su país). Queda prohibido el uso por menores.',
      },
      {
        type: 'p',
        text: 'Al crear una cuenta o usar la plataforma, aceptas estos Términos y la Política de Privacidad. Si no estás de acuerdo, no debes registrarte ni continuar usando el servicio.',
      },
      {
        type: 'p',
        text: 'Las cuentas personales pueden registrarse e iniciar sesión con Google OAuth. Business y Organizaciones deben registrarse con correo y contraseña.',
      },
      {
        type: 'p',
        text: 'Quien registre una cuenta Business u Organización declara tener capacidad para representar a esa entidad.',
      },
    ],
  },
  {
    id: 'cuentas-y-responsabilidades',
    title: '¿Cuáles son las responsabilidades de cuentas personales y Business/Organizaciones?',
    blocks: [
      {
        type: 'p',
        text: 'Cuentas personales:',
      },
      {
        type: 'ul',
        items: [
          'Proporcionar información veraz y mantener el perfil actualizado.',
          'Custodiar sus credenciales de acceso.',
          'Usar la plataforma de forma profesional y respetuosa.',
        ],
      },
      {
        type: 'p',
        text: 'Business y Organizaciones:',
      },
      {
        type: 'ul',
        items: [
          'Publicar información real sobre la organización y las ofertas.',
          'Gestionar postulaciones de forma responsable y conforme a la ley.',
          'No solicitar pagos, depósitos o inversiones a personas como condición para participar en un proceso.',
          'Tratar los datos recibidos en postulaciones como responsables independientes de ese tratamiento.',
        ],
      },
    ],
  },
  {
    id: 'ofertas-de-empleo',
    title: '¿Cómo funcionan las ofertas de empleo?',
    blocks: [
      {
        type: 'p',
        text: 'Las cuentas Business y Organizaciones pueden publicar ofertas con requisitos, descripción y, si lo desean, formularios de postulación personalizados. Las cuentas personales pueden explorar, guardar y postularse.',
      },
      {
        type: 'p',
        text: 'TrabaGE no cobra a las cuentas personales por postularse ni por usar las funcionalidades básicas de la plataforma. Actualmente no existen planes de pago para publicar ofertas. Las empresas no deben solicitar pagos, depósitos ni inversiones a candidatos como condición para participar en un proceso.',
      },
      {
        type: 'p',
        text: 'TrabaGE no garantiza que una oferta esté siempre abierta, que el proceso culmine en contratación ni que la información publicada por terceros sea completa o exacta. Actuamos como intermediario tecnológico.',
      },
      {
        type: 'p',
        text: 'Está prohibido publicar ofertas engañosas, discriminatorias ilegales, fraudulentas o que soliciten dinero a quienes se postulan.',
      },
    ],
  },
  {
    id: 'contenido-permitido-prohibido',
    title: '¿Qué contenido está permitido o prohibido?',
    blocks: [
      {
        type: 'p',
        text: 'Puedes publicar contenido profesional relacionado con empleo, talento y oportunidades, siempre que respetes a la comunidad y la ley.',
      },
      {
        type: 'p',
        text: 'No está permitido, entre otros:',
      },
      {
        type: 'ul',
        items: [
          'Contenido ilegal, difamatorio, discriminatorio, violento u obsceno.',
          'Suplantación de identidad o perfiles falsos.',
          'Spam, phishing, malware o ingeniería social.',
          'Acoso, amenazas o comportamiento abusivo.',
          'Ofertas fraudulentas o esquemas de estafa.',
          'Uso de la plataforma para fines ajenos al empleo y al networking profesional legítimo.',
        ],
      },
      {
        type: 'p',
        text: 'Eres responsable del contenido que subes (textos, fotos, logos, documentos). Al publicarlo, nos concedes una licencia no exclusiva para mostrarlo y operar el servicio.',
      },
    ],
  },
  {
    id: 'feed-y-comunidad',
    title: '¿Cómo funciona el feed y la comunidad?',
    blocks: [
      {
        type: 'p',
        text: 'TrabaGE incluye un feed de contenido profesional donde las cuentas personales, Business y Organizaciones pueden publicar textos e imágenes relacionados con empleo, talento y oportunidades.',
      },
      {
        type: 'p',
        text: 'Las cuentas personales pueden seguir cuentas Business y Organizaciones (no otras cuentas personales). El contenido publicado debe cumplir las normas de contenido permitido y puede ser reportado por otros usuarios.',
      },
      {
        type: 'p',
        text: 'TrabaGE no garantiza la veracidad de todo el contenido generado por usuarios en el feed y actúa como intermediario tecnológico en su publicación y distribución.',
      },
    ],
  },
  {
    id: 'cuentas-verificadas',
    title: '¿Qué significan las cuentas verificadas?',
    blocks: [
      {
        type: 'p',
        text: 'Una empresa u organización verificada ha superado un proceso de revisión documental que acredita su existencia legal mediante dos documentos: documento de la empresa (NIF o Licencia Comercial) y documento del representante legal (DIP o Pasaporte). El sello de verificación es visible en su perfil y ofertas.',
      },
      {
        type: 'p',
        text: 'La verificación no implica que TrabaGE avale la solvencia, reputación o prácticas laborales de la cuenta. Las cuentas no verificadas pueden seguir usando la plataforma, con la distinción visible para el talento.',
      },
    ],
  },
  {
    id: 'proteccion-comunidad',
    title: '¿Cómo protegemos la comunidad?',
    blocks: [
      {
        type: 'p',
        text: 'Disponemos de herramientas de reporte, revisión de verificaciones y medidas técnicas para detectar abuso y fraude. Animamos a reportar conductas sospechosas desde la plataforma o por soporte.',
      },
      {
        type: 'p',
        text: 'Tomamos en serio la protección de menores: si detectamos una cuenta de menor, la suspenderemos de inmediato.',
      },
    ],
  },
  {
    id: 'violaciones-y-suspension',
    title: '¿Qué ocurre si se vulneran estas normas?',
    blocks: [
      {
        type: 'p',
        text: 'Ante incumplimientos, TrabaGE puede, según la gravedad:',
      },
      {
        type: 'ul',
        items: [
          'Advertir al usuario.',
          'Retirar contenido.',
          'Limitar funcionalidades.',
          'Suspender o eliminar la cuenta.',
          'Conservar información necesaria para seguridad o cumplimiento legal.',
          'Colaborar con autoridades cuando proceda.',
        ],
      },
      {
        type: 'p',
        text: 'También puedes solicitar la eliminación voluntaria de tu cuenta en cualquier momento desde Configuración.',
      },
    ],
  },
  {
    id: 'actualizaciones-plataforma',
    title: '¿Puede TrabaGE actualizar la plataforma o estos términos?',
    blocks: [
      {
        type: 'p',
        text: 'Sí. Podemos mejorar, modificar o discontinuar funcionalidades, y actualizar estos Términos cuando sea necesario. Los cambios relevantes se comunicarán con antelación razonable.',
      },
      {
        type: 'p',
        text: 'El servicio puede experimentar mantenimientos o interrupciones. Procuramos avisar cuando afecten de forma significativa.',
      },
      {
        type: 'p',
        text: 'Si no aceptas una actualización de los Términos, debes dejar de usar la plataforma y puedes solicitar la baja de tu cuenta.',
      },
    ],
  },
  {
    id: 'propiedad-intelectual',
    title: '¿Quién es titular de la propiedad intelectual?',
    blocks: [
      {
        type: 'p',
        text: 'TrabaGE, su marca, diseño, código y materiales propios pertenecen a sus titulares legítimos. No puedes copiarlos, modificarlos ni explotarlos fuera del uso permitido de la plataforma.',
      },
      {
        type: 'p',
        text: 'Conservas los derechos sobre tu propio contenido; TrabaGE solo lo utiliza para operar y mostrar el servicio.',
      },
    ],
  },
  {
    id: 'marcas-terceros-uso',
    title: '¿Cómo se mencionan empresas e instituciones en TrabaGE?',
    blocks: [
      {
        type: 'p',
        text: 'TrabaGE funciona como directorio y espacio de red profesional. La inclusión, mención o listado de nombres de empresas, universidades, centros educativos, instituciones públicas o entidades privadas se realiza de manera estrictamente descriptiva, nominativa e informativa. El único propósito de estas menciones es permitir que los usuarios identifiquen correctamente su trayectoria académica, laboral o profesional en sus perfiles individuales.',
      },
    ],
  },
  {
    id: 'marcas-terceros-deslinde',
    title: '¿Implica la mención de una marca afiliación con TrabaGE?',
    blocks: [
      {
        type: 'p',
        text: 'La aparición del nombre de cualquier institución, empresa o universidad en nuestro motor de búsqueda o en los perfiles de los usuarios no implica, bajo ninguna circunstancia, que dicha entidad:',
      },
      {
        type: 'ul',
        items: [
          'Tenga una relación comercial, alianza estratégica o sociedad con esta plataforma.',
          'Avale, patrocine, recomiende o supervise los servicios prestados por nuestra aplicación.',
          'Sea responsable del contenido, opiniones o interacciones generadas por los usuarios dentro de la plataforma.',
        ],
      },
      {
        type: 'p',
        text: 'Todos los derechos sobre las marcas de texto, nombres comerciales y denominaciones pertenecen exclusivamente a sus respectivos titulares legítimos.',
      },
    ],
  },
  {
    id: 'politica-logotipos',
    title: '¿Cuál es la política sobre logotipos e identidad gráfica?',
    blocks: [
      {
        type: 'p',
        text: 'Esta plataforma prohíbe explícitamente a los usuarios comunes la carga, uso o reproducción de logotipos oficiales, isotipos o artes gráficos protegidos por derechos de autor o leyes de propiedad industrial pertenecientes a terceros sin su debida autorización por escrito.',
      },
      {
        type: 'p',
        text: 'Por defecto, el sistema asignará avatares, iconos o vectores genéricos para identificar empresas o instituciones educativas que no hayan verificado oficialmente su perfil. El uso no autorizado de un logotipo por parte de un usuario será responsabilidad exclusiva de este.',
      },
      {
        type: 'p',
        text: 'Las cuentas Business u Organización que suban un logotipo declaran ser titulares legítimos de esa marca o contar con autorización suficiente para mostrarla en TrabaGE.',
      },
    ],
  },
  {
    id: 'take-down-marcas',
    title: '¿Cómo solicitar corrección, restricción o retirada de contenido?',
    blocks: [
      {
        type: 'p',
        text: 'Respetamos profundamente los derechos de propiedad intelectual de terceros. Si usted es el representante legal o titular de los derechos de una empresa, universidad o institución listada en nuestra plataforma y desea:',
      },
      {
        type: 'ul',
        items: [
          'Solicitar la corrección o actualización de la denominación de su entidad.',
          'Restringir la aparición del nombre de su institución en nuestro buscador.',
          'Reportar el uso no autorizado de su logotipo por parte de un tercero.',
        ],
      },
      {
        type: 'p',
        text: `Puede ponerse en contacto directo con nuestro departamento legal a través del correo electrónico: ${SUPPORT_EMAIL}, adjuntando la acreditación de su representación. Nos comprometemos a revisar y procesar su solicitud en un plazo no mayor a 72 horas hábiles.`,
      },
    ],
  },
  {
    id: 'limitacion-responsabilidad',
    title: '¿Cuál es el alcance de responsabilidad de TrabaGE?',
    blocks: [
      {
        type: 'p',
        text: 'TrabaGE es un intermediario tecnológico. No es parte de las relaciones laborales entre cuentas personales y Business/Organizaciones, no garantiza empleo y no responde por la veracidad de todo el contenido de terceros.',
      },
      {
        type: 'p',
        text: 'En la medida permitida por la ley, no respondemos por daños indirectos, pérdida de oportunidades, fraude de otros usuarios o fallos ajenos a nuestro control razonable. El tratamiento que una empresa haga de tus datos tras una postulación es responsabilidad de esa empresa.',
      },
    ],
  },
  {
    id: 'contacto-soporte',
    title: '¿Cómo contactar con soporte?',
    blocks: [
      {
        type: 'p',
        text: 'Para consultas, incidencias, reportes de abuso o fraude:',
      },
      {
        type: 'ul',
        items: [
          `Correo: ${SUPPORT_EMAIL}`,
          'Centro de ayuda dentro de TrabaGE',
        ],
      },
      {
        type: 'p',
        text: 'Procuramos responder en un plazo razonable, priorizando temas de seguridad.',
      },
    ],
  },
  {
    id: 'tecnologia-zarrel',
    title: '¿Quién ha diseñado y desarrollado TrabaGE?',
    blocks: [
      {
        type: 'p',
        text: 'TrabaGE fue diseñado y desarrollado por [ZARREL](https://zarrel.org), empresa de software, diseño digital y soluciones tecnológicas. ZARREL es el responsable tecnológico de la plataforma.',
      },
      {
        type: 'p',
        text: 'Más información: https://zarrel.org',
      },
    ],
  },
  {
    id: 'legislacion',
    title: '¿Qué ley aplica?',
    blocks: [
      {
        type: 'p',
        text: 'Estos Términos se rigen por la legislación de la República de Guinea Ecuatorial, sin perjuicio de derechos imperativos de consumidores que puedan corresponder. La versión vinculante es la redactada en español.',
      },
      {
        type: 'p',
        text: 'Si alguna cláusula fuera inválida, el resto del documento seguirá vigente. Estos Términos y la Política de Privacidad constituyen el acuerdo completo sobre el uso de TrabaGE.',
      },
    ],
  },
];

export const TERMS_FINAL_ARTICLES = [];
