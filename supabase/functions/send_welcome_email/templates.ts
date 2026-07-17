import {
  buildCtaUrl,
  type WelcomeAccountType,
} from './constants.ts';
import { formatGreeting, type WelcomeEmailContent } from './layout.ts';

interface TemplateDefinition {
  subject: string;
  introParagraphs: string[];
  recommendationLead: string;
  bulletItems: string[];
  closingParagraphs: string[];
  ctaLabel: string;
}

const TEMPLATE_DEFINITIONS: Record<WelcomeAccountType, TemplateDefinition> = {
  personal: {
    subject: 'Bienvenido a TrabaGE, donde las oportunidades te encuentran.',
    introParagraphs: [
      '¡Te damos la bienvenida a TrabaGE!',
      'Nos alegra que hayas decidido formar parte de nuestra comunidad.',
      'Desde hoy tienes acceso a una plataforma diseñada para ayudarte a descubrir oportunidades profesionales y conectar con empresas y organizaciones de Guinea Ecuatorial.',
    ],
    recommendationLead: 'Te recomendamos comenzar por:',
    bulletItems: [
      'Completar tu perfil profesional.',
      'Añadir tu experiencia, formación y habilidades.',
      'Subir tu CV.',
      'Descubrir oportunidades adaptadas a tu perfil.',
      'Seguir empresas y organizaciones de tu interés.',
    ],
    closingParagraphs: [
      'Cuanto más completo esté tu perfil, mejores oportunidades podrás descubrir.',
      'Te deseamos mucho éxito en esta nueva etapa.',
    ],
    ctaLabel: 'Completar mi perfil',
  },
  business: {
    subject: 'Bienvenido a TrabaGE Business.',
    introParagraphs: [
      '¡Te damos la bienvenida a TrabaGE!',
      'Gracias por registrar tu negocio en nuestra plataforma.',
      'TrabaGE te permitirá conectar con profesionales, publicar oportunidades y dar mayor visibilidad a tu negocio dentro de Guinea Ecuatorial.',
    ],
    recommendationLead: 'Te recomendamos comenzar por:',
    bulletItems: [
      'Completar el perfil de tu negocio.',
      'Añadir tu logotipo y descripción.',
      'Publicar tu primera oferta de empleo.',
      'Compartir novedades y publicaciones.',
      'Conectar con talento cualificado.',
    ],
    closingParagraphs: [
      'Estamos encantados de contar con tu negocio como parte de nuestra comunidad.',
    ],
    ctaLabel: 'Publicar mi primera oferta',
  },
  organization: {
    subject: 'Bienvenido a TrabaGE Organizaciones.',
    introParagraphs: [
      '¡Te damos la bienvenida a TrabaGE!',
      'Nos alegra que tu organización forme parte de nuestra comunidad.',
      'TrabaGE es un espacio donde organizaciones, instituciones y profesionales pueden conectar para generar nuevas oportunidades.',
    ],
    recommendationLead: 'Te recomendamos comenzar por:',
    bulletItems: [
      'Completar el perfil de tu organización.',
      'Añadir el logotipo y la información institucional.',
      'Publicar oportunidades y novedades.',
      'Compartir información con la comunidad.',
      'Conectar con profesionales interesados en vuestra actividad.',
    ],
    closingParagraphs: [
      'Esperamos acompañaros en vuestro crecimiento y contribuir a que lleguéis a más personas.',
    ],
    ctaLabel: 'Completar perfil de la organización',
  },
};

export function buildWelcomeEmailContent(
  accountType: WelcomeAccountType,
  userName?: string | null,
): WelcomeEmailContent {
  const template = TEMPLATE_DEFINITIONS[accountType];

  return {
    subject: template.subject,
    greeting: formatGreeting(userName),
    introParagraphs: template.introParagraphs,
    recommendationLead: template.recommendationLead,
    bulletItems: template.bulletItems,
    closingParagraphs: template.closingParagraphs,
    ctaLabel: template.ctaLabel,
    ctaUrl: buildCtaUrl(accountType),
  };
}

export function getWelcomeEmailSubject(accountType: WelcomeAccountType) {
  return TEMPLATE_DEFINITIONS[accountType].subject;
}
