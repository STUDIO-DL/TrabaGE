import {
  Bell,
  Briefcase,
  Building2,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from './icons';

export const NOTIFICATION_PERMISSION_STATUS = {
  DEFAULT: 'default',
  GRANTED: 'granted',
  DENIED: 'denied',
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  push_enabled: false,
  permission_status: NOTIFICATION_PERMISSION_STATUS.DEFAULT,
  permission_prompted_at: null,
  employment_new_jobs: true,
  employment_application_updates: true,
  employment_company_invitations: true,
  companies_new_followers: true,
  companies_verified: true,
  companies_replies: true,
  activity_likes: true,
  activity_comments: true,
  activity_new_followers: true,
  activity_post_interactions: true,
  messages_new: true,
  messages_conversations: true,
  account_security: true,
  system_updates: true,
  system_features: true,
  system_maintenance: true,
};

export const NOTIFICATION_PREFERENCE_FIELDS = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES)
  .filter((key) => typeof DEFAULT_NOTIFICATION_PREFERENCES[key] === 'boolean');

export const NOTIFICATION_PREFERENCE_GROUPS = [
  {
    id: 'employment',
    title: 'Empleo',
    description: 'Oportunidades, candidaturas e invitaciones relacionadas con tu actividad laboral.',
    icon: Briefcase,
    items: [
      {
        key: 'employment_new_jobs',
        title: 'Nuevas ofertas compatibles',
        description: 'Nuevas ofertas compatibles con mi perfil.',
      },
      {
        key: 'employment_application_updates',
        title: 'Cambios en mis postulaciones',
        description: 'Actualizaciones sobre el estado de tus candidaturas.',
      },
      {
        key: 'employment_company_invitations',
        title: 'Invitaciones de empresas',
        description: 'Empresas que quieren conectar contigo o invitarte a procesos.',
      },
    ],
  },
  {
    id: 'companies',
    title: 'Empresas',
    description: 'Actividad relevante de empresas, verificaciones y respuestas.',
    icon: Building2,
    items: [
      {
        key: 'companies_new_followers',
        title: 'Nuevos seguidores',
        description: 'Avisos cuando nuevas personas sigan tu empresa.',
      },
      {
        key: 'companies_verified',
        title: 'Empresas verificadas',
        description: 'Confirmaciones y cambios de estado de verificación.',
      },
      {
        key: 'companies_replies',
        title: 'Respuestas de empresas',
        description: 'Respuestas relevantes de empresas dentro de TrabaGE.',
      },
    ],
  },
  {
    id: 'activity',
    title: 'Actividad',
    description: 'Interacciones sociales y movimiento alrededor de tus publicaciones.',
    icon: Users,
    items: [
      { key: 'activity_likes', title: 'Likes', description: 'Interacciones positivas con tu contenido.' },
      { key: 'activity_comments', title: 'Comentarios', description: 'Comentarios nuevos en tus publicaciones.' },
      { key: 'activity_new_followers', title: 'Nuevos seguidores', description: 'Personas que empiezan a seguirte.' },
      {
        key: 'activity_post_interactions',
        title: 'Interacciones con mis publicaciones',
        description: 'Actividad importante alrededor de tus publicaciones.',
      },
    ],
  },
  {
    id: 'messages',
    title: 'Mensajes',
    description: 'Preparado para futuras conversaciones dentro de la plataforma.',
    icon: Mail,
    badge: 'Próximamente',
    items: [
      { key: 'messages_new', title: 'Nuevos mensajes', description: 'Avisos cuando recibas mensajes directos.' },
      { key: 'messages_conversations', title: 'Conversaciones', description: 'Actividad en conversaciones abiertas.' },
    ],
  },
  {
    id: 'account',
    title: 'Cuenta',
    description: 'Seguridad, inicio de sesión y cambios críticos de tu cuenta.',
    icon: ShieldCheck,
    locked: true,
    items: [
      {
        key: 'account_security',
        title: 'Seguridad de la cuenta',
        description: 'Inicio de sesión, cambios importantes, alertas de seguridad y cambio de contraseña. Siempre activo.',
      },
    ],
  },
  {
    id: 'system',
    title: 'Sistema',
    description: 'Novedades de producto y comunicaciones operativas de TrabaGE.',
    icon: Wrench,
    items: [
      { key: 'system_updates', title: 'Actualizaciones de TrabaGE', description: 'Avisos sobre cambios generales de la plataforma.' },
      { key: 'system_features', title: 'Nuevas funciones', description: 'Lanzamientos y mejoras importantes.' },
      { key: 'system_maintenance', title: 'Mantenimiento programado', description: 'Interrupciones previstas o tareas técnicas.' },
    ],
  },
];

export const NOTIFICATION_MASTER_CARD = {
  icon: Bell,
  title: 'Recibir notificaciones',
  description: 'Permite que TrabaGE te envíe notificaciones importantes.',
};

export const NOTIFICATION_SAVED_COPY = {
  saved: 'Guardado',
  saving: 'Guardando...',
  denied: 'No se activaron las notificaciones. Puedes permitirlas más tarde desde los ajustes del dispositivo o navegador.',
  permissionRequired: 'Activa el permiso de notificaciones del dispositivo para recibir avisos push.',
  securityAlwaysOn: 'Las alertas críticas de cuenta y seguridad permanecen siempre activas para proteger tu cuenta.',
};

export const NOTIFICATION_EMPTY_STATE_ICON = Sparkles;
