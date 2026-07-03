/** Política de Privacidad — TrabaGE v2.0 (contenido definitivo, sin notas de revisión legal) */

export const PRIVACY_INTRO = {
  part: 'Parte B',
  title: 'Política de Privacidad',
  subtitle:
    'Información sobre cómo TrabaGE recopila, utiliza, comparte y protege los datos personales de sus usuarios.',
};

export const PRIVACY_ARTICLES = [
  {
    id: 'article-20',
    title: 'Artículo 20. Marco Legal y Principios Generales',
    blocks: [
      {
        type: 'p',
        text: '20.1. TrabaGE está comprometida con la protección de la privacidad y los datos personales de sus usuarios. La presente Política de Privacidad describe qué información recopilamos, cómo la utilizamos, con quién la compartimos y qué derechos asisten a los usuarios en relación con sus datos.',
      },
      {
        type: 'p',
        text: '20.2. El tratamiento de datos personales se realiza conforme a los principios de licitud, lealtad y transparencia; limitación de la finalidad; minimización de datos; exactitud; limitación del plazo de conservación; integridad y confidencialidad; y responsabilidad proactiva.',
      },
    ],
  },
  {
    id: 'article-21',
    title: 'Artículo 21. Datos Personales Recopilados',
    blocks: [
      { type: 'p', text: '21.1. TrabaGE recopila los siguientes tipos de datos personales:' },
      { type: 'p', text: '21.1.1. Datos proporcionados directamente por el usuario' },
      {
        type: 'ul',
        items: [
          'Candidatos: nombre y apellidos, dirección de correo electrónico, número de teléfono, fecha de nacimiento, fotografía de perfil, imagen de portada, headline profesional, biografía, experiencia laboral, formación académica, habilidades, idiomas, certificados, CV y documentos adjuntos, y preferencias laborales.',
          'Empresas: nombre o razón social, datos de contacto del representante, sector de actividad, descripción de la empresa, logotipo, imagen de portada, documentación acreditativa de existencia legal (en caso de verificación) y formularios de postulación personalizados.',
          'Datos de formularios de postulación: toda la información que el candidato proporcione al completar un formulario personalizado de una empresa, incluyendo respuestas a preguntas abiertas y archivos adjuntos.',
        ],
      },
      { type: 'p', text: '21.1.2. Datos generados automáticamente por el uso del servicio' },
      {
        type: 'ul',
        items: [
          'Datos técnicos: dirección IP, tipo y versión de navegador o sistema operativo, identificadores de dispositivo.',
          'Datos de uso: páginas visitadas, funcionalidades utilizadas, búsquedas realizadas, postulaciones enviadas, empresas seguidas, publicaciones creadas, tiempo de sesión.',
          'Datos de comunicación: registros de notificaciones push enviadas y recibidas.',
          'Datos de diagnóstico: registros de errores y datos de rendimiento recopilados por herramientas de monitorización.',
        ],
      },
      { type: 'p', text: '21.1.3. Datos recibidos de servicios de terceros' },
      {
        type: 'ul',
        items: [
          'Google OAuth: cuando el usuario inicia sesión mediante su cuenta de Google, TrabaGE recibe de Google el nombre, la dirección de correo electrónico y la fotografía de perfil asociados a esa cuenta de Google, en los términos autorizados por el usuario en el momento de la autenticación.',
        ],
      },
    ],
  },
  {
    id: 'article-22',
    title: 'Artículo 22. Finalidades y Base Jurídica del Tratamiento',
    blocks: [
      { type: 'p', text: '22.1. TrabaGE trata los datos personales para las siguientes finalidades y con las correspondientes bases jurídicas:' },
      {
        type: 'ul',
        items: [
          'Prestación del servicio: gestión de cuentas, perfiles, postulaciones, verificación de usuarios y empresas. Base jurídica: ejecución del contrato con el usuario.',
          'Transmisión de postulaciones: envío del perfil y documentación del candidato a la empresa destinataria. Base jurídica: ejecución del contrato y consentimiento expreso del candidato al postularse.',
          'Notificaciones: envío de notificaciones sobre actividad de cuenta, actualizaciones de postulaciones, nuevas ofertas y alertas relevantes. Base jurídica: ejecución del contrato e interés legítimo.',
          'Mejora del servicio: análisis del uso de la Plataforma para identificar áreas de mejora y optimizar la experiencia de usuario. Base jurídica: interés legítimo de TrabaGE.',
          'Seguridad y prevención del fraude: detección, investigación y prevención de actividades ilícitas y usos indebidos. Base jurídica: interés legítimo y cumplimiento de obligaciones legales.',
          'Cumplimiento legal: respuesta a requerimientos de autoridades competentes y cumplimiento de obligaciones normativas. Base jurídica: cumplimiento de una obligación legal.',
          'Comunicaciones comerciales: información sobre nuevas funcionalidades, servicios u otras novedades. Base jurídica: consentimiento del usuario cuando sea exigido, o interés legítimo en caso contrario.',
        ],
      },
    ],
  },
  {
    id: 'article-23',
    title: 'Artículo 23. Almacenamiento: Supabase y Servicios en la Nube',
    blocks: [
      {
        type: 'p',
        text: '23.1. TrabaGE utiliza Supabase como plataforma principal para la autenticación, almacenamiento y gestión de datos. Los servicios de Supabase empleados incluyen Supabase Auth, Supabase Database (PostgreSQL) y Supabase Storage.',
      },
      {
        type: 'p',
        text: '23.2. Los datos almacenados a través de Supabase pueden procesarse en centros de datos ubicados fuera de Guinea Ecuatorial, según la configuración de región seleccionada por TrabaGE. TrabaGE se asegura de que dichas transferencias internacionales se realizan con las garantías adecuadas conforme a la normativa aplicable.',
      },
      {
        type: 'p',
        text: '23.3. Para información detallada sobre las prácticas de privacidad de Supabase, el usuario puede consultar la Política de Privacidad disponible en https://supabase.com/privacy.',
      },
    ],
  },
  {
    id: 'article-24',
    title: 'Artículo 24. Autenticación con Google OAuth',
    blocks: [
      {
        type: 'p',
        text: '24.1. TrabaGE ofrece la posibilidad de registrarse e iniciar sesión mediante Google OAuth, un servicio de autenticación de Google LLC. Al utilizar esta funcionalidad, el usuario autoriza a Google a compartir con TrabaGE determinada información de su perfil de Google, según los permisos que el propio usuario apruebe durante el proceso de autenticación.',
      },
      {
        type: 'p',
        text: '24.2. Los datos recibidos de Google a través de OAuth se utilizan exclusivamente para crear y gestionar la cuenta del usuario en TrabaGE y no se comparten con terceros más allá de lo descrito en esta Política de Privacidad.',
      },
      {
        type: 'p',
        text: '24.3. Para información sobre cómo Google trata los datos del usuario, puede consultarse la Política de Privacidad de Google en https://policies.google.com/privacy.',
      },
    ],
  },
  {
    id: 'article-25',
    title: 'Artículo 25. Monitorización Técnica: Sentry y Herramientas de Diagnóstico',
    blocks: [
      {
        type: 'p',
        text: '25.1. TrabaGE utiliza Sentry (Functional Software, Inc.) para la monitorización de errores técnicos, detección de fallos y mejora de la estabilidad de la Plataforma. Sentry puede recopilar datos técnicos como registros de errores, seguimientos de pila (stack traces), identificadores de sesión anónimos e información sobre el entorno del dispositivo.',
      },
      {
        type: 'p',
        text: '25.2. TrabaGE configura Sentry para minimizar la recogida de datos personales identificables. Para más información sobre las prácticas de privacidad de Sentry, puede consultarse https://sentry.io/privacy/.',
      },
    ],
  },
  {
    id: 'article-26',
    title: 'Artículo 26. Notificaciones Push',
    blocks: [
      {
        type: 'p',
        text: '26.1. TrabaGE podrá enviar notificaciones push a los dispositivos de los usuarios a través de proveedores de servicios de mensajería como OneSignal u otros servicios equivalentes.',
      },
      {
        type: 'p',
        text: '26.2. Las notificaciones push podrán incluir: información sobre nuevas ofertas de empleo relevantes, actualizaciones sobre el estado de las postulaciones, selección del candidato para avanzar en un proceso, alertas de actividad en la cuenta y comunicaciones de seguridad del servicio.',
      },
      {
        type: 'p',
        text: '26.3. El usuario puede gestionar sus preferencias de notificación en cualquier momento desde la configuración de su cuenta en la Plataforma o desde la configuración de notificaciones de su dispositivo. La desactivación de notificaciones no afectará al acceso a las funcionalidades principales de la Plataforma.',
      },
    ],
  },
  {
    id: 'article-27',
    title: 'Artículo 27. Cookies y Tecnologías Similares',
    blocks: [
      {
        type: 'p',
        text: '27.1. TrabaGE utiliza cookies y tecnologías similares (como almacenamiento local, balizas web o identificadores de sesión) para garantizar el correcto funcionamiento de la Plataforma, mejorar la experiencia del usuario y obtener información analítica sobre el uso del servicio.',
      },
      { type: 'p', text: '27.2. Las cookies utilizadas por TrabaGE se clasifican en:' },
      {
        type: 'ul',
        items: [
          'Cookies estrictamente necesarias: imprescindibles para el funcionamiento básico de la Plataforma, incluyendo la autenticación y la seguridad de sesión. No requieren consentimiento del usuario.',
          'Cookies de análisis y rendimiento: permiten medir el tráfico, el comportamiento de los usuarios y la eficacia del servicio. Requieren consentimiento cuando así lo exija la normativa aplicable.',
          'Cookies de funcionalidad: recuerdan las preferencias del usuario para personalizar su experiencia.',
        ],
      },
      {
        type: 'p',
        text: '27.3. El usuario puede configurar su navegador para bloquear o eliminar cookies, si bien ello podrá afectar la disponibilidad o correcto funcionamiento de determinadas funcionalidades de la Plataforma.',
      },
    ],
  },
  {
    id: 'article-28',
    title: 'Artículo 28. Compartición de Datos con Terceros',
    blocks: [
      {
        type: 'p',
        text: '28.1. TrabaGE no vende, alquila ni cede datos personales de los usuarios a terceros con fines comerciales propios de esos terceros.',
      },
      { type: 'p', text: '28.2. TrabaGE puede compartir datos personales únicamente en los siguientes supuestos:' },
      {
        type: 'ul',
        items: [
          'Con empresas que publican ofertas: al producirse una postulación, la información del perfil del candidato, los datos del formulario de postulación y los documentos adjuntos son transmitidos a la empresa destinataria. El candidato acepta esta transmisión al realizar la postulación. Tras la transmisión, la empresa actúa como responsable independiente del tratamiento de esos datos.',
          'Con proveedores de servicios tecnológicos: proveedores que prestan servicios de infraestructura, autenticación, almacenamiento, analítica, monitorización o comunicaciones en nombre de TrabaGE (incluyendo Supabase, Google LLC, Sentry, OneSignal). Estos proveedores actúan como encargados del tratamiento y están sujetos a obligaciones de confidencialidad y seguridad.',
          'Por requerimiento legal: cuando sea necesario para cumplir con obligaciones legales, órdenes judiciales o requerimientos de autoridades competentes.',
          'En procesos corporativos: en caso de fusión, adquisición, reorganización o venta de activos de TrabaGE, los datos podrán transferirse al sucesor o adquirente, que quedará obligado por esta Política de Privacidad.',
        ],
      },
    ],
  },
  {
    id: 'article-29',
    title: 'Artículo 29. Integraciones con Servicios de Terceros',
    blocks: [
      {
        type: 'p',
        text: '29.1. TrabaGE podrá integrar en el futuro funcionalidades o servicios de terceros, como herramientas de pago, servicios de análisis avanzado, plataformas de comunicación, sistemas de inteligencia artificial para recomendación de empleo u otras integraciones que mejoren la experiencia del usuario.',
      },
      {
        type: 'p',
        text: '29.2. Cuando se introduzcan nuevas integraciones que impliquen tratamiento de datos personales, TrabaGE informará a los usuarios con antelación razonable y actualizará la presente Política de Privacidad.',
      },
      {
        type: 'p',
        text: '29.3. Los servicios de terceros integrados tienen sus propias políticas de privacidad, cuya consulta se recomienda al usuario. TrabaGE no es responsable de las prácticas de privacidad de terceros.',
      },
    ],
  },
  {
    id: 'article-30',
    title: 'Artículo 30. Conservación de los Datos',
    blocks: [
      {
        type: 'p',
        text: '30.1. TrabaGE conservará los datos personales durante el tiempo necesario para el cumplimiento de las finalidades para las que fueron recogidos y, en todo caso, durante los plazos legalmente exigidos en la jurisdicción aplicable.',
      },
      { type: 'p', text: '30.2. Tras la eliminación de una cuenta, TrabaGE podrá conservar determinados datos durante un periodo adicional para:' },
      {
        type: 'ul',
        items: [
          'Cumplimiento de obligaciones legales, fiscales o contables.',
          'Prevención del fraude y seguridad de la Plataforma.',
          'Resolución de disputas pendientes.',
        ],
      },
      {
        type: 'p',
        text: '30.3. Los datos conservados exclusivamente para los fines anteriores serán tratados de forma restringida y no serán utilizados para ninguna otra finalidad.',
      },
      {
        type: 'p',
        text: '30.4. Las postulaciones transmitidas a empresas destinatarias son tratadas por estas como responsables independientes del tratamiento. El candidato deberá dirigirse directamente a la empresa para solicitar la eliminación de dichos datos.',
      },
    ],
  },
  {
    id: 'article-31',
    title: 'Artículo 31. Derechos de los Usuarios sobre sus Datos',
    blocks: [
      { type: 'p', text: '31.1. En relación con sus datos personales, los usuarios tienen los siguientes derechos:' },
      {
        type: 'ul',
        items: [
          'Derecho de acceso: obtener confirmación de si TrabaGE trata datos personales suyos y acceder a dicha información.',
          'Derecho de rectificación: solicitar la corrección de datos inexactos o incompletos.',
          'Derecho de supresión ("derecho al olvido"): solicitar la eliminación de sus datos cuando ya no sean necesarios para los fines para los que fueron recogidos, salvo obligación legal de conservación.',
          'Derecho de limitación del tratamiento: solicitar la restricción del tratamiento de sus datos en determinados supuestos.',
          'Derecho de portabilidad: recibir sus datos en un formato estructurado, de uso común y lectura mecánica, cuando el tratamiento se base en el consentimiento o en la ejecución de un contrato.',
          'Derecho de oposición: oponerse al tratamiento de sus datos para determinadas finalidades basadas en el interés legítimo de TrabaGE.',
          'Derecho a retirar el consentimiento: cuando el tratamiento se base en el consentimiento del usuario, este podrá retirarlo en cualquier momento, sin que ello afecte a la licitud del tratamiento previo.',
        ],
      },
      {
        type: 'p',
        text: '31.2. Para ejercer cualquiera de estos derechos, el usuario puede dirigirse a TrabaGE a través de los canales indicados en el Artículo 15, acreditando su identidad. TrabaGE responderá en el plazo legalmente establecido.',
      },
    ],
  },
  {
    id: 'article-32',
    title: 'Artículo 32. Medidas de Seguridad',
    blocks: [
      { type: 'p', text: '32.1. TrabaGE implementa medidas técnicas y organizativas adecuadas para proteger los datos personales contra el acceso no autorizado, la alteración, divulgación o destrucción. Estas medidas incluyen, entre otras:' },
      {
        type: 'ul',
        items: [
          'Cifrado de datos en tránsito mediante protocolos seguros (HTTPS/TLS).',
          'Gestión segura de credenciales y accesos a través de Supabase Auth.',
          'Control de accesos basado en roles (Row Level Security en Supabase Database).',
          'Revisión periódica de los controles de seguridad.',
          'Uso de infraestructura en la nube con certificaciones de seguridad reconocidas.',
        ],
      },
      {
        type: 'p',
        text: '32.2. A pesar de las medidas implementadas, ninguna transmisión de datos por Internet ni sistema de almacenamiento puede garantizar seguridad absoluta. En caso de producirse una brecha de seguridad que afecte a datos personales, TrabaGE notificará a los usuarios afectados y a las autoridades competentes en los plazos y formas establecidos por la normativa aplicable.',
      },
    ],
  },
  {
    id: 'article-33',
    title: 'Artículo 33. Actualizaciones de la Política de Privacidad',
    blocks: [
      {
        type: 'p',
        text: '33.1. TrabaGE podrá actualizar la presente Política de Privacidad cuando sea necesario para reflejar cambios en el servicio, en los tratamientos realizados, en la normativa aplicable o en las integraciones de terceros.',
      },
      {
        type: 'p',
        text: '33.2. Las actualizaciones serán notificadas a los usuarios registrados con antelación razonable y publicadas en la Plataforma con indicación de la fecha de última actualización.',
      },
      {
        type: 'p',
        text: '33.3. El uso continuado de la Plataforma tras la entrada en vigor de las actualizaciones implicará la aceptación de la nueva Política de Privacidad.',
      },
    ],
  },
];
