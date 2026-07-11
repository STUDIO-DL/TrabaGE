/** Política de Privacidad — TrabaGE v2.0 (formato Q&A) */

export const PRIVACY_INTRO = {
  part: '',
  title: 'Política de Privacidad',
  subtitle:
    'Explicamos de forma clara qué datos usamos, para qué, cómo los protegemos y qué control tienes sobre ellos.',
};

export const PRIVACY_ARTICLES = [
  {
    id: 'que-informacion-recopilamos',
    title: '¿Qué información recopilamos?',
    blocks: [
      {
        type: 'p',
        text: 'Recopilamos la información necesaria para que TrabaGE funcione como plataforma de empleo y networking profesional.',
      },
      {
        type: 'p',
        text: 'Datos que nos facilitas:',
      },
      {
        type: 'ul',
        items: [
          'Cuentas personales: nombre, correo, teléfono, fecha de nacimiento, foto de perfil y portada, headline, biografía, experiencia, formación, habilidades, idiomas, certificados, CV y preferencias laborales.',
          'Business y Organizaciones: nombre o razón social, datos del representante, sector, descripción, logo, portada, documentación de verificación (si la solicitas) y formularios de postulación personalizados.',
          'Postulaciones: respuestas y archivos que envías al aplicar a una oferta.',
        ],
      },
      {
        type: 'p',
        text: 'Datos generados por el uso del servicio:',
      },
      {
        type: 'ul',
        items: [
          'Datos técnicos: IP, tipo de navegador o sistema operativo e identificadores de dispositivo.',
          'Datos de uso: páginas visitadas, búsquedas, postulaciones, follows, publicaciones y duración de sesión.',
          'Notificaciones: registros de envío y recepción de avisos push.',
          'Diagnóstico: errores y métricas de rendimiento (por ejemplo, a través de Sentry), configurados para minimizar datos identificables.',
        ],
      },
      {
        type: 'p',
        text: 'Datos de terceros: si inicias sesión con Google, recibimos el nombre, correo y foto de perfil que Google nos autoriza a obtener.',
      },
    ],
  },
  {
    id: 'por-que-utilizamos-esta-informacion',
    title: '¿Por qué utilizamos esta información?',
    blocks: [
      {
        type: 'p',
        text: 'Usamos tus datos para:',
      },
      {
        type: 'ul',
        items: [
          'Crear y gestionar tu cuenta, perfil y preferencias.',
          'Permitir postulaciones y transmitir tu perfil y documentos a la empresa a la que aplicas.',
          'Enviar notificaciones relevantes (estado de postulaciones, ofertas, seguridad).',
          'Mejorar el producto y la experiencia de uso.',
          'Detectar fraude, abuso y usos indebidos.',
          'Cumplir obligaciones legales cuando corresponda.',
          'Informarte de novedades del servicio, cuando la normativa lo permita o hayas dado tu consentimiento.',
        ],
      },
    ],
  },
  {
    id: 'como-protegemos-tus-datos',
    title: '¿Cómo protegemos tus datos?',
    blocks: [
      {
        type: 'p',
        text: 'Aplicamos medidas técnicas y organizativas habituales en plataformas modernas:',
      },
      {
        type: 'ul',
        items: [
          'Cifrado en tránsito (HTTPS/TLS).',
          'Autenticación y gestión de sesiones a través de Supabase Auth.',
          'Control de acceso por roles (incluyendo Row Level Security en base de datos).',
          'Infraestructura en la nube con prácticas de seguridad reconocidas.',
          'Revisión periódica de controles de seguridad.',
        ],
      },
      {
        type: 'p',
        text: 'Ningún sistema es 100 % invulnerable. Si detectáramos una brecha que afecte a datos personales, informaríamos según la normativa aplicable.',
      },
    ],
  },
  {
    id: 'compartimos-tus-datos',
    title: '¿Compartimos tus datos?',
    blocks: [
      {
        type: 'p',
        text: 'No vendemos ni alquilamos tus datos personales.',
      },
      {
        type: 'p',
        text: 'Podemos compartir información solo en estos casos:',
      },
      {
        type: 'ul',
        items: [
          'Con empresas a las que te postulas: al aplicar, compartes tu perfil, respuestas del formulario y documentos adjuntos con esa empresa. Ella pasa a tratar esos datos como responsable independiente.',
          'Con proveedores tecnológicos que nos ayudan a operar el servicio (autenticación, almacenamiento, push, diagnóstico), bajo obligaciones de confidencialidad y seguridad.',
          'Cuando la ley o una autoridad competente lo exija.',
          'En una fusión, adquisición u operación corporativa similar, con el sucesor obligado por esta política.',
        ],
      },
    ],
  },
  {
    id: 'proveedores-externos',
    title: '¿Qué ocurre cuando usamos proveedores externos?',
    blocks: [
      {
        type: 'p',
        text: 'TrabaGE se apoya en proveedores especializados para ofrecer un servicio estable y seguro:',
      },
      {
        type: 'ul',
        items: [
          'Supabase: autenticación, base de datos y almacenamiento. Más info: https://supabase.com/privacy',
          'Google OAuth: inicio de sesión con Google. Más info: https://policies.google.com/privacy',
          'OneSignal (u equivalente): notificaciones push.',
          'Sentry: monitorización de errores técnicos. Más info: https://sentry.io/privacy/',
        ],
      },
      {
        type: 'p',
        text: 'Estos proveedores actúan como encargados del tratamiento o según su propio rol legal. Si añadimos nuevas integraciones relevantes, actualizaremos esta política.',
      },
    ],
  },
  {
    id: 'notificaciones',
    title: '¿Cómo gestionamos las notificaciones?',
    blocks: [
      {
        type: 'p',
        text: 'Podemos enviarte notificaciones push (por ejemplo, vía OneSignal) sobre ofertas relevantes, cambios en postulaciones, actividad de cuenta y avisos de seguridad.',
      },
      {
        type: 'p',
        text: 'Puedes ajustar tus preferencias desde Configuración → Notificaciones, o desde los ajustes de tu dispositivo. Desactivar notificaciones no elimina el acceso al resto de la plataforma.',
      },
    ],
  },
  {
    id: 'cuentas-verificadas',
    title: '¿Cómo protegemos las cuentas verificadas?',
    blocks: [
      {
        type: 'p',
        text: 'La verificación de empresas acredita, tras revisión, la existencia legal de la entidad mediante documentación oficial. El sello de verificación aumenta la confianza en la comunidad, pero no es un endoso de solvencia ni de prácticas de contratación.',
      },
      {
        type: 'p',
        text: 'Los documentos de verificación se tratan con acceso restringido y solo para el proceso de revisión. No se muestran públicamente en el feed ni en el perfil.',
      },
    ],
  },
  {
    id: 'business-y-organizaciones',
    title: '¿Cómo tratamos la información de Business y Organizaciones?',
    blocks: [
      {
        type: 'p',
        text: 'Los perfiles Business/Organización incluyen datos públicos orientados a atraer talento (nombre, sector, descripción, logo, ofertas). Los datos del representante y la documentación de verificación se usan para administración, soporte y verificación.',
      },
      {
        type: 'p',
        text: 'Business y Organizaciones son responsables del tratamiento de los datos de cuentas personales que reciben al gestionar postulaciones.',
      },
    ],
  },
  {
    id: 'fotografias-y-documentos',
    title: '¿Qué ocurre con las fotografías y documentos de verificación?',
    blocks: [
      {
        type: 'p',
        text: 'Fotos de perfil, portadas, logos, CVs y adjuntos de postulación se almacenan de forma segura y se usan solo para las finalidades del servicio (perfil, empleo, verificación).',
      },
      {
        type: 'p',
        text: 'Los documentos de verificación empresarial se conservan el tiempo necesario para revisar la solicitud y, si procede, mantener el historial de verificación y seguridad. No se publican en el feed ni en ofertas.',
      },
    ],
  },
  {
    id: 'conservacion',
    title: '¿Durante cuánto tiempo conservamos los datos?',
    blocks: [
      {
        type: 'p',
        text: 'Conservamos los datos mientras tu cuenta esté activa y el tiempo necesario para prestar el servicio. Tras eliminar la cuenta, podremos retener cierta información de forma limitada para cumplir obligaciones legales, prevenir fraude o resolver disputas.',
      },
      {
        type: 'p',
        text: 'Los datos ya enviados a una empresa en una postulación quedan bajo responsabilidad de esa empresa; para borrarlos allí, contacta directamente con ella.',
      },
    ],
  },
  {
    id: 'eliminar-cuenta',
    title: '¿Cómo puedes eliminar tu cuenta?',
    blocks: [
      {
        type: 'p',
        text: 'Puedes solicitar la eliminación desde Configuración → Eliminar cuenta. La acción es irreversible: tu perfil dejará de estar visible y procesaremos la baja conforme a esta política.',
      },
      {
        type: 'p',
        text: 'También puedes escribir a soporte.trabage@gmail.com si necesitas ayuda con el proceso.',
      },
    ],
  },
  {
    id: 'derechos-usuarios',
    title: '¿Qué derechos tienen los usuarios?',
    blocks: [
      {
        type: 'p',
        text: 'Según la normativa aplicable, puedes solicitar:',
      },
      {
        type: 'ul',
        items: [
          'Acceso a tus datos.',
          'Rectificación de datos inexactos.',
          'Supresión, cuando proceda.',
          'Limitación u oposición en determinados casos.',
          'Portabilidad, cuando corresponda.',
          'Retirada del consentimiento, sin afectar el tratamiento previo.',
        ],
      },
      {
        type: 'p',
        text: 'Para ejercer estos derechos, contacta con soporte.trabage@gmail.com o usa los canales de la plataforma. Responderemos en los plazos legalmente establecidos.',
      },
    ],
  },
  {
    id: 'contacto',
    title: '¿Cómo puedes contactar con nosotros?',
    blocks: [
      {
        type: 'p',
        text: 'Para privacidad, soporte o derechos sobre tus datos:',
      },
      {
        type: 'ul',
        items: [
          'Correo: soporte.trabage@gmail.com',
          'Centro de ayuda dentro de TrabaGE',
        ],
      },
    ],
  },
  {
    id: 'tecnologia-zarrel',
    title: '¿Quién ha desarrollado la tecnología de TrabaGE?',
    blocks: [
      {
        type: 'p',
        text: 'TrabaGE fue diseñado y desarrollado por [ZARREL](https://zarrel.org), empresa especializada en software, diseño digital y soluciones tecnológicas. ZARREL es el responsable tecnológico de la plataforma.',
      },
      {
        type: 'p',
        text: 'Más información sobre ZARREL: https://zarrel.org',
      },
    ],
  },
  {
    id: 'actualizaciones',
    title: '¿Cómo actualizamos esta política?',
    blocks: [
      {
        type: 'p',
        text: 'Podemos actualizar esta Política de Privacidad cuando cambie el servicio, la normativa o nuestros proveedores. Publicaremos la versión vigente en la plataforma e informaremos con antelación razonable cuando el cambio sea relevante.',
      },
      {
        type: 'p',
        text: 'El uso continuado de TrabaGE tras la entrada en vigor de una actualización implica la aceptación de la nueva versión.',
      },
    ],
  },
];
