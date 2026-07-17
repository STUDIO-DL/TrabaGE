import { SUPPORT_EMAIL } from '../../constants/support';

/** Aviso Legal / Propiedad Intelectual — marcas de terceros (TrabaGE) */

export const IP_NOTICE_INTRO = {
  part: 'Aviso Legal',
  title: 'Aviso Legal / Propiedad Intelectual',
  subtitle:
    'Uso informativo y nominativo de marcas, nombres comerciales e identidad gráfica de terceros en TrabaGE.',
};

export const IP_NOTICE_ARTICLES = [
  {
    id: 'uso-informativo-referencial',
    title: '1. Uso informativo y referencial de marcas',
    blocks: [
      {
        type: 'p',
        text: 'Esta plataforma web funciona como un directorio y espacio de red profesional. La inclusión, mención o listado de nombres de empresas, universidades, centros educativos, instituciones públicas o entidades privadas se realiza de manera estrictamente descriptiva, nominativa e informativa. El único propósito de estas menciones es permitir que los usuarios identifiquen correctamente su trayectoria académica, laboral o profesional en sus perfiles individuales.',
      },
    ],
  },
  {
    id: 'deslinde-asociacion',
    title: '2. Deslinde de asociación, patrocinio o afiliación',
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
    title: '3. Política sobre el uso de logotipos e identidad gráfica',
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
    id: 'take-down',
    title: '4. Procedimiento de notificación, aclaración y retirada (Take-Down)',
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
];

/** Nota corta para buscador / directorio */
export const DIRECTORY_BRAND_DISCLAIMER =
  'Aviso legal: Los nombres de empresas, universidades e instituciones que aparecen en este directorio se muestran exclusivamente con fines informativos y de referencia para los perfiles de los usuarios. Su mención no implica afiliación, patrocinio ni vinculación comercial con los titulares de dichas marcas. Todos los derechos pertenecen a sus respectivos dueños.';
