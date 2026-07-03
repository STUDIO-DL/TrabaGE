export { SUPPORT_EMAIL } from '../constants/support';

export const helpCategories = [
  {
    id: 'account',
    title: 'Cuenta y Perfil',
    questions: [
      {
        question: '¿Cómo creo una cuenta en TrabaGE?',
        answer:
          'Crear tu cuenta es rápido y gratuito. Accede a la plataforma y haz clic en "Registrarse". Podrás elegir entre registrarte como candidato o como empresa. Completa el formulario con tus datos básicos, acepta los Términos y Condiciones y confirma tu correo electrónico. En menos de dos minutos tendrás tu cuenta activa.',
      },
      {
        question: '¿Cuál es la diferencia entre una cuenta de candidato y una cuenta de empresa?',
        answer:
          'Cuenta de candidato: te permite crear tu perfil profesional, subir tu CV, buscar ofertas de empleo y postularte a vacantes.\n\nCuenta de empresa: te permite crear el perfil de tu organización, publicar ofertas de trabajo, recibir postulaciones y gestionar procesos de selección.\n\nCada tipo de cuenta tiene un panel de control adaptado a sus necesidades específicas.',
      },
      {
        question: '¿Puedo tener una cuenta de candidato y una cuenta de empresa al mismo tiempo?',
        answer:
          'En este momento, cada dirección de correo electrónico está asociada a un único tipo de cuenta. Si necesitas acceder a ambas funcionalidades, deberás registrarte con correos electrónicos diferentes para cada perfil.',
      },
      {
        question: '¿Cómo completo o edito mi perfil profesional?',
        answer:
          'Accede a tu cuenta y dirígete a la sección "Mi Perfil". Desde allí podrás añadir o editar tu información personal, experiencia laboral, formación académica, habilidades, idiomas, fotografía de perfil y documentos adjuntos. Te recomendamos mantener tu perfil actualizado para aumentar tus posibilidades de ser contactado por empresas.',
      },
      {
        question: '¿Qué información debo incluir en mi perfil para destacar?',
        answer:
          'Un perfil completo aumenta significativamente tu visibilidad ante las empresas. Asegúrate de incluir:\n\n• Fotografía de perfil clara y profesional.\n• Titular profesional que describa tu rol o aspiración.\n• Resumen breve sobre ti y tu trayectoria.\n• Experiencia laboral detallada con fechas y logros.\n• Formación académica actualizada.\n• Habilidades técnicas y blandas relevantes.\n• Idiomas con nivel de competencia.\n• CV en formato PDF adjunto.',
      },
      {
        question: '¿Cómo subo o actualizo mi CV?',
        answer:
          'En tu perfil, accede al apartado "Documentos" y selecciona "Subir CV". Admitimos archivos en formato PDF. Te recomendamos que tu CV esté actualizado y no supere los 5 MB. Puedes reemplazar tu CV en cualquier momento subiendo una nueva versión.',
      },
      {
        question: '¿Puedo cambiar mi dirección de correo electrónico?',
        answer:
          'Sí. Accede a "Configuración de cuenta" y selecciona "Cambiar correo electrónico". Por motivos de seguridad, deberás verificar tu nueva dirección antes de que el cambio sea efectivo. Si tienes dificultades para hacerlo, contacta con nuestro equipo de soporte.',
      },
      {
        question: '¿Cómo cambio mi contraseña?',
        answer:
          'Ve a "Configuración de cuenta" y selecciona "Seguridad". Allí encontrarás la opción para cambiar tu contraseña. Te pediremos que introduzcas tu contraseña actual y que elijas una nueva. Si has olvidado tu contraseña, utiliza la opción "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.',
      },
      {
        question: '¿Cómo elimino mi cuenta?',
        answer:
          'Puedes solicitar la eliminación de tu cuenta desde "Configuración de cuenta" > "Eliminar cuenta". Esta acción es irreversible. Una vez eliminada la cuenta, tu perfil dejará de ser visible y tus datos serán tratados conforme a nuestra Política de Privacidad. Determinada información podrá conservarse durante un tiempo limitado por razones legales o de seguridad.',
      },
      {
        question: '¿Mi perfil es visible para todos?',
        answer:
          'Los perfiles de candidatos son visibles para las empresas registradas en la plataforma. Puedes controlar la visibilidad de tu perfil desde la configuración de privacidad. Si deseas no aparecer en búsquedas de empresas, puedes desactivar la visibilidad pública de tu perfil sin perder acceso a las funcionalidades de búsqueda y postulación.',
      },
    ],
  },
  {
    id: 'jobs',
    title: 'Empleos y Postulaciones',
    questions: [
      {
        question: '¿Cómo busco ofertas de empleo en TrabaGE?',
        answer:
          'Accede a la sección "Ofertas" desde el menú principal. Puedes utilizar el buscador introduciendo palabras clave, cargo o sector, y filtrar los resultados por ubicación, modalidad de trabajo (presencial, remoto o híbrido), tipo de contrato y fecha de publicación. Los resultados se actualizan en tiempo real.',
      },
      {
        question: '¿Cómo me postulo a una oferta de empleo?',
        answer:
          'Cuando encuentres una oferta que te interese, accede a su página de detalle y haz clic en "Postularme". El sistema enviará automáticamente tu perfil y el CV que tengas cargado a la empresa. Asegúrate de tener tu perfil y CV actualizados antes de postularte.',
      },
      {
        question: '¿Puedo postularme a varias ofertas al mismo tiempo?',
        answer:
          'Sí. Puedes postularte a todas las ofertas que consideres relevantes para tu perfil. Te recomendamos que te asegures de cumplir con los requisitos de cada oferta antes de postularte, para aumentar la efectividad de tus candidaturas.',
      },
      {
        question: '¿Cómo sé si mi postulación ha sido recibida?',
        answer:
          'Una vez enviada tu postulación, recibirás una confirmación en la plataforma y, si tienes las notificaciones activadas, también recibirás un aviso por notificación push o correo electrónico. Además, podrás consultar el estado de todas tus postulaciones en la sección "Mis Postulaciones".',
      },
      {
        question: '¿Puedo retirar una postulación después de enviarla?',
        answer:
          'Sí, puedes retirar una postulación mientras la empresa no haya iniciado la revisión de tu candidatura. Accede a "Mis Postulaciones", selecciona la candidatura que deseas retirar y haz clic en "Retirar postulación". Una vez que la empresa haya accedido a tu perfil, es posible que no podamos garantizar la retirada completa de tus datos de su sistema.',
      },
      {
        question: '¿Por qué no aparecen resultados cuando busco empleo?',
        answer:
          'Puede deberse a varios motivos:\n\n• Los filtros aplicados son demasiado restrictivos. Prueba a ampliar la búsqueda eliminando algunos filtros.\n• No existen ofertas activas en ese momento para el puesto o ubicación buscados.\n• Las palabras clave introducidas no coinciden con los títulos de las ofertas disponibles. Prueba con sinónimos o términos más generales.\n\nSi el problema persiste, contacta con nuestro equipo de soporte.',
      },
      {
        question: '¿Puedo guardar ofertas para verlas más tarde?',
        answer:
          'Sí. En cada oferta encontrarás un icono para guardarla en tu lista de "Favoritos". Accede a tu lista de favoritos desde tu perfil para revisarlas cuando quieras. Ten en cuenta que las ofertas guardadas pueden caducar si la empresa las retira o cierra el proceso.',
      },
      {
        question: '¿TrabaGE me garantiza que conseguiré empleo?',
        answer:
          'No. TrabaGE es una plataforma de intermediación laboral que facilita el contacto entre candidatos y empresas, pero no interviene en los procesos de selección ni garantiza resultados. Las decisiones de contratación son responsabilidad exclusiva de las empresas.',
      },
      {
        question: '¿Qué hago si sospecho que una oferta es fraudulenta?',
        answer:
          'Si detectas una oferta que te parece sospechosa, por ejemplo porque solicita un pago para participar en el proceso, no reporta datos de empresa verificables o las condiciones son poco realistas, repórtala de inmediato mediante el botón "Reportar oferta" disponible en la página de la oferta. Nuestro equipo la revisará y tomará las medidas oportunas.\n\nRecuerda: TrabaGE nunca cobra a los candidatos por postularse a ninguna oferta, y ninguna empresa legítima debería solicitarte un pago para participar en un proceso de selección.',
      },
    ],
  },
  {
    id: 'companies',
    title: 'Empresas',
    questions: [
      {
        question: '¿Cómo registro mi empresa en TrabaGE?',
        answer:
          'Accede a la plataforma y selecciona "Registrarse como empresa". Completa el formulario con los datos de tu organización: nombre, sector, país, ciudad y datos de contacto. Una vez creada la cuenta, podrás completar el perfil de empresa y comenzar a publicar ofertas.',
      },
      {
        question: '¿Cómo publico una oferta de empleo?',
        answer:
          'Desde el panel de empresa, accede a "Publicar oferta" y completa el formulario con los datos de la vacante: título del puesto, descripción, requisitos, tipo de contrato, modalidad, ubicación, salario (opcional) y fecha de cierre. Revisa la información antes de publicar y haz clic en "Publicar". La oferta quedará visible para los candidatos de inmediato.',
      },
      {
        question: '¿Cuántas ofertas puedo publicar simultáneamente?',
        answer:
          'El número de ofertas activas simultáneas puede variar según el plan de la plataforma. Consulta la sección "Planes y tarifas" en tu panel de empresa para conocer los límites aplicables a tu cuenta. Si necesitas publicar un mayor número de ofertas, contacta con nuestro equipo.',
      },
      {
        question: '¿Cómo gestiono las postulaciones recibidas?',
        answer:
          'Accede a "Gestión de postulaciones" desde tu panel de empresa. Desde allí podrás ver todos los candidatos que se han postulado a cada oferta, revisar sus perfiles y CVs, y actualizar el estado de cada candidatura (en revisión, preseleccionado, descartado, etc.).',
      },
      {
        question: '¿Puedo editar o eliminar una oferta publicada?',
        answer:
          'Sí. Accede a "Mis ofertas" en tu panel de empresa, selecciona la oferta que deseas modificar y haz clic en "Editar". También puedes pausar o cerrar una oferta en cualquier momento si el proceso de selección ha concluido o la vacante ya no está disponible.',
      },
      {
        question: '¿Qué ocurre con las postulaciones si cierro una oferta?',
        answer:
          'Si cierras una oferta, las candidaturas recibidas hasta ese momento se conservan en tu panel de gestión. Los candidatos que se hayan postulado serán notificados de que la oferta ha sido cerrada. No se aceptarán nuevas postulaciones una vez cerrada.',
      },
    ],
  },
  {
    id: 'verification',
    title: 'Verificación de Empresas',
    questions: [
      {
        question: '¿Qué significa que una empresa esté "verificada"?',
        answer:
          'Una empresa verificada es aquella que ha completado el proceso de verificación de TrabaGE, acreditando su existencia legal mediante documentación oficial. Las empresas verificadas muestran un sello de verificación visible en su perfil y en sus ofertas, lo que transmite mayor confianza a los candidatos.',
      },
      {
        question: '¿Cómo puedo verificar mi empresa?',
        answer:
          'Accede a tu panel de empresa y dirígete a "Verificación de empresa". Desde allí podrás iniciar el proceso de verificación aportando la documentación requerida, que puede incluir certificado de registro mercantil, documento de identificación fiscal u otros documentos que acrediten la existencia legal de tu organización según el país de operación.',
      },
      {
        question: '¿Cuánto tiempo tarda el proceso de verificación?',
        answer:
          'El proceso de revisión documental tiene una duración habitual de 2 a 5 días hábiles desde la recepción de la documentación completa. Te notificaremos por correo electrónico y en la plataforma cuando el proceso haya concluido.',
      },
      {
        question: '¿Puedo publicar ofertas mientras espero la verificación?',
        answer:
          'Sí. Las empresas no verificadas pueden publicar ofertas en la plataforma. Sin embargo, sus publicaciones mostrarán una indicación de que la empresa aún no ha sido verificada. Te recomendamos completar el proceso de verificación para aumentar la confianza de los candidatos en tus ofertas.',
      },
      {
        question: '¿Qué diferencia hay entre una oferta de empresa verificada y una no verificada?',
        answer:
          'Las ofertas de empresas verificadas muestran el sello de verificación de TrabaGE, lo que indica que la empresa ha acreditado su existencia legal. Las ofertas de empresas no verificadas muestran un aviso indicando que la empresa no ha completado el proceso de verificación. Esta distinción ayuda a los candidatos a tomar decisiones informadas.',
      },
      {
        question: '¿Puede revocarse la verificación de mi empresa?',
        answer:
          'Sí. TrabaGE se reserva el derecho de revocar la verificación si detecta que la documentación aportada era falsa o ha caducado, si se reciben denuncias fundadas sobre prácticas fraudulentas, o si la empresa incumple los Términos y Condiciones de la plataforma. En caso de revocación, la empresa será notificada con los motivos correspondientes.',
      },
      {
        question: '¿Qué documentos se aceptan para la verificación?',
        answer:
          'Los documentos aceptados pueden variar según el país de registro de la empresa. Con carácter general, se aceptan:\n\n• Certificado de registro mercantil o equivalente.\n• Documento de identificación fiscal de la empresa (NIF, RUT o equivalente).\n• Escritura de constitución de la sociedad.\n• Cualquier documento oficial que acredite la actividad económica de la organización.\n\nEl equipo de TrabaGE podrá solicitar documentación adicional si lo considera necesario durante el proceso de revisión.',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notificaciones',
    questions: [
      {
        question: '¿Qué tipos de notificaciones envía TrabaGE?',
        answer:
          'TrabaGE puede enviarte notificaciones sobre:\n\n• Nuevas ofertas de empleo que coincidan con tu perfil o búsquedas guardadas.\n• Actualizaciones sobre el estado de tus postulaciones.\n• Nuevas postulaciones recibidas (para empresas).\n• Novedades importantes del servicio y actualizaciones de seguridad.',
      },
      {
        question: '¿Cómo activo o desactivo las notificaciones push?',
        answer:
          'Accede a "Configuración" > "Notificaciones" en tu cuenta. Desde allí podrás personalizar qué tipos de notificaciones deseas recibir y por qué canal (notificación en la plataforma, correo electrónico o notificación push en el dispositivo). También puedes gestionar los permisos de notificaciones directamente desde la configuración de tu navegador o dispositivo.',
      },
      {
        question: '¿Por qué no estoy recibiendo notificaciones?',
        answer:
          'Si no recibes notificaciones, comprueba lo siguiente:\n\n1. Verifica que las notificaciones estén activadas en tu configuración de cuenta en TrabaGE.\n2. Comprueba que tu navegador o dispositivo tenga permiso concedido para mostrar notificaciones de TrabaGE.\n3. Asegúrate de que tu dirección de correo electrónico esté verificada y sea correcta.\n4. Revisa la carpeta de spam o correo no deseado de tu cliente de correo.\n\nSi el problema persiste, contacta con soporte.',
      },
      {
        question: '¿Puedo elegir recibir notificaciones solo por correo electrónico?',
        answer:
          'Sí. En la configuración de notificaciones puedes elegir el canal preferido para cada tipo de aviso: notificación en la plataforma, correo electrónico o notificación push. Puedes desactivar las notificaciones push y mantener activo únicamente el correo electrónico si así lo prefieres.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Seguridad y Privacidad',
    questions: [
      {
        question: '¿Cómo protege TrabaGE mis datos personales?',
        answer:
          'TrabaGE implementa medidas técnicas y organizativas para proteger tu información, incluyendo cifrado de datos en tránsito mediante protocolos seguros (HTTPS), gestión segura de credenciales y controles de acceso. Los datos se almacenan en infraestructura en la nube con certificaciones de seguridad reconocidas. Puedes consultar todos los detalles en nuestra Política de Privacidad.',
      },
      {
        question: '¿Quién puede ver mi CV y mis documentos?',
        answer:
          'Tu CV y documentos adjuntos únicamente son compartidos con las empresas a las que tú decides postularte. TrabaGE no comparte tu documentación con terceros sin tu consentimiento, salvo en los casos indicados en la Política de Privacidad (por ejemplo, requerimientos legales).',
      },
      {
        question: '¿Cómo puedo solicitar la eliminación de mis datos personales?',
        answer: `Tienes derecho a solicitar la eliminación de tus datos personales en cualquier momento. Puedes hacerlo desde "Configuración de cuenta" > "Eliminar cuenta", o enviando una solicitud escrita a ${SUPPORT_EMAIL}. Procesaremos tu solicitud conforme a la normativa aplicable y te informaremos del resultado.`,
      },
      {
        question: '¿Qué hago si creo que mi cuenta ha sido comprometida?',
        answer: `Si sospechas que alguien ha accedido a tu cuenta sin tu autorización, actúa de inmediato:\n\n1. Cambia tu contraseña desde "Configuración" > "Seguridad".\n2. Revisa la actividad reciente de tu cuenta.\n3. Contacta con nuestro equipo de soporte en ${SUPPORT_EMAIL} para que podamos investigar y proteger tu cuenta.`,
      },
      {
        question: '¿TrabaGE vende mis datos a terceros?',
        answer:
          'No. TrabaGE no vende, alquila ni cede datos personales de sus usuarios a terceros con fines comerciales propios de esos terceros. La información solo es compartida en los términos descritos en nuestra Política de Privacidad: con empresas a las que te postulas (con tu consentimiento), con proveedores tecnológicos que nos prestan servicios, y cuando sea requerido por ley.',
      },
      {
        question: '¿Cómo reporto un usuario o empresa con comportamiento sospechoso?',
        answer: `Si detectas una cuenta, perfil u oferta que consideras fraudulenta o inapropiada, puedes reportarla directamente desde la plataforma utilizando el botón "Reportar" disponible en cada perfil y oferta. También puedes escribirnos a ${SUPPORT_EMAIL} con el detalle de tu denuncia. Revisaremos todos los reportes y actuaremos con la mayor diligencia posible.`,
      },
      {
        question: '¿TrabaGE utiliza cookies?',
        answer:
          'Sí. TrabaGE utiliza cookies y tecnologías similares para garantizar el funcionamiento de la plataforma, recordar tus preferencias y obtener información analítica sobre el uso del servicio. Puedes gestionar tus preferencias de cookies desde la configuración de tu navegador. Para más información, consulta nuestra Política de Privacidad.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contacto y Soporte',
    questions: [
      {
        question: '¿Cómo puedo contactar con el equipo de TrabaGE?',
        answer: `Puedes ponerte en contacto con nosotros a través de los siguientes canales:\n\n• Correo electrónico: ${SUPPORT_EMAIL}\n• Formulario de contacto: disponible en la sección "Contacto" de la plataforma.\n\nNuestro equipo procura responder en un plazo no superior a 48 horas hábiles desde la recepción de tu consulta.`,
      },
      {
        question: '¿Qué información debo incluir al contactar con soporte?',
        answer:
          'Para que podamos ayudarte con mayor rapidez, incluye en tu mensaje:\n\n• Tu nombre completo y dirección de correo electrónico registrada.\n• Descripción detallada del problema o consulta.\n• Capturas de pantalla si el problema es de carácter técnico.\n• El nombre de la oferta o empresa implicada, si aplica.',
      },
      {
        question: '¿Dónde puedo enviar sugerencias o comentarios sobre la plataforma?',
        answer: `Valoramos enormemente tu opinión. Puedes enviarnos tus sugerencias, ideas o comentarios a ${SUPPORT_EMAIL} indicando en el asunto "Sugerencia". Todas las aportaciones son revisadas por nuestro equipo y contribuyen a mejorar la experiencia de todos los usuarios de TrabaGE.`,
      },
      {
        question: '¿Cómo puedo reportar un error técnico en la plataforma?',
        answer: `Si encuentras un error técnico, escríbenos a ${SUPPORT_EMAIL} con el asunto "Error técnico". Incluye una descripción del problema, el dispositivo y navegador que estás utilizando, y si es posible, una captura de pantalla. Trabajamos continuamente para mantener la plataforma estable y tu reporte nos ayuda a mejorar.`,
      },
    ],
  },
];

const COMPANY_PRIORITY_IDS = ['companies', 'verification'];

export function orderHelpCategories(categories, role) {
  if (role !== 'company') return categories;

  return [...categories].sort((a, b) => {
    const aIndex = COMPANY_PRIORITY_IDS.indexOf(a.id);
    const bIndex = COMPANY_PRIORITY_IDS.indexOf(b.id);
    const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return aRank - bRank;
  });
}

export function filterHelpCategories(categories, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return categories;

  return categories
    .map((category) => {
      const categoryMatches = category.title.toLowerCase().includes(normalized);
      const questions = category.questions.filter(
        (item) =>
          item.question.toLowerCase().includes(normalized) ||
          item.answer.toLowerCase().includes(normalized) ||
          categoryMatches,
      );

      return { ...category, questions };
    })
    .filter((category) => category.questions.length > 0);
}

export function getHelpPath(role) {
  if (role === 'company') return '/company/help';
  if (role === 'admin') return '/admin/help';
  return '/help';
}
