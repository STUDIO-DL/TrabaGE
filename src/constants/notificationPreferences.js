import {
  Bell,
  Briefcase,
  Building2,
  Mail,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from './icons';
import { ROLES, isEmployerRole } from './roles';

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
  employment_new_applications: true,
  companies_new_followers: true,
  companies_verified: true,
  activity_post_interactions: true,
  messages_new: true,
  system_updates: true,
  marketing_enabled: false,
  account_security: true,
};

export const NOTIFICATION_PREFERENCE_FIELDS = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES)
  .filter((key) => typeof DEFAULT_NOTIFICATION_PREFERENCES[key] === 'boolean');

export const NOTIFICATION_TYPE_MAP = {
  employment_new_jobs: ['job_recommendation', 'new_job'],
  employment_application_updates: [
    'application_viewed',
    'application_contacted',
    'application_accepted',
    'application_rejected',
  ],
  employment_new_applications: ['new_application'],
  companies_new_followers: ['new_follower', 'company_new_follower'],
  companies_verified: [
    'verification_submitted',
    'verification_approved',
    'verification_rejected',
    'company_verified',
    'user_verified',
  ],
  activity_post_interactions: ['new_post', 'company_update'],
  messages_new: ['new_message', 'conversation_update'],
  system_updates: [
    'system_update',
    'system_notification',
    'system_alert',
    'admin_notification',
    'admin_broadcast',
  ],
  marketing_enabled: ['marketing', 'promotional'],
};

const CANDIDATE_NOTIFICATION_GROUPS = [
  {
    id: 'employment',
    title: 'Empleo',
    description: 'Ofertas compatibles con tu perfil y el estado de tus postulaciones.',
    icon: Briefcase,
    items: [
      {
        key: 'employment_new_jobs',
        title: 'Ofertas recomendadas y nuevas vacantes',
        description: 'Recomendaciones personalizadas y ofertas de empresas que sigues.',
        notificationTypes: NOTIFICATION_TYPE_MAP.employment_new_jobs,
      },
      {
        key: 'employment_application_updates',
        title: 'Estado de mis postulaciones',
        description: 'Cuando una empresa revisa, contacta o responde a tu candidatura.',
        notificationTypes: NOTIFICATION_TYPE_MAP.employment_application_updates,
      },
    ],
  },
  {
    id: 'followed_companies',
    title: 'Cuentas que sigo',
    description: 'Actividad de las cuentas Business y organizaciones que sigues en TrabaGE.',
    icon: Building2,
    items: [
      {
        key: 'activity_post_interactions',
        title: 'Publicaciones de cuentas seguidas',
        description: 'Nuevas publicaciones de cuentas Business u organizaciones que sigues.',
        notificationTypes: NOTIFICATION_TYPE_MAP.activity_post_interactions,
      },
    ],
  },
];

const COMPANY_NOTIFICATION_GROUPS = [
  {
    id: 'applications',
    title: 'Candidaturas',
    description: 'Actividad relacionada con tus ofertas publicadas.',
    icon: Briefcase,
    items: [
      {
        key: 'employment_new_applications',
        title: 'Nuevas candidaturas recibidas',
        description: 'Cuando un candidato aplica a una de tus ofertas.',
        notificationTypes: NOTIFICATION_TYPE_MAP.employment_new_applications,
      },
    ],
  },
  {
    id: 'followers',
    title: 'Seguidores',
    description: 'Interés de candidatos en tu empresa.',
    icon: Users,
    items: [
      {
        key: 'companies_new_followers',
        title: 'Nuevos seguidores',
        description: 'Cuando un candidato empieza a seguir tu empresa.',
        notificationTypes: NOTIFICATION_TYPE_MAP.companies_new_followers,
      },
    ],
  },
  {
    id: 'verification',
    title: 'Verificación',
    description: 'Actualizaciones sobre el estado de verificación de tu empresa.',
    icon: ShieldCheck,
    items: [
      {
        key: 'companies_verified',
        title: 'Estado de verificación',
        description: 'Confirmaciones y cambios en tu solicitud de verificación.',
        notificationTypes: NOTIFICATION_TYPE_MAP.companies_verified,
      },
    ],
  },
];

const SHARED_NOTIFICATION_GROUPS = [
  {
    id: 'messages',
    title: 'Mensajes',
    description: 'Comunicaciones directas entre cuentas en TrabaGE.',
    icon: Mail,
    items: [
      {
        key: 'messages_new',
        title: 'Mensajes nuevos',
        description: 'Cuando recibes un mensaje interno.',
        notificationTypes: NOTIFICATION_TYPE_MAP.messages_new,
      },
    ],
  },
  {
    id: 'system',
    title: 'Sistema',
    description: 'Avisos importantes de la plataforma y del equipo de TrabaGE.',
    icon: Settings,
    items: [
      {
        key: 'system_updates',
        title: 'Alertas y avisos del sistema',
        description: 'Mantenimiento, novedades de la plataforma y comunicaciones oficiales.',
        notificationTypes: NOTIFICATION_TYPE_MAP.system_updates,
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'Contenido promocional opcional. Puedes desactivarlo sin afectar avisos laborales.',
    icon: Sparkles,
    items: [
      {
        key: 'marketing_enabled',
        title: 'Ofertas y novedades promocionales',
        description: 'Comunicaciones comerciales y campañas especiales de TrabaGE.',
        notificationTypes: NOTIFICATION_TYPE_MAP.marketing_enabled,
      },
    ],
  },
];

export function getNotificationGroupsForRole(role) {
  const base = isEmployerRole(role) ? COMPANY_NOTIFICATION_GROUPS : CANDIDATE_NOTIFICATION_GROUPS;
  return [...base, ...SHARED_NOTIFICATION_GROUPS];
}

export const NOTIFICATION_MASTER_CARD = {
  icon: Bell,
  title: 'Recibir notificaciones',
  description:
    'Activa avisos in-app y push en este dispositivo para ofertas, postulaciones, mensajes y novedades de cuentas que sigues.',
};

export const NOTIFICATION_SAVED_COPY = {
  saved: 'Guardado',
  saving: 'Guardando...',
  activated: 'Notificaciones in-app y push activadas en este dispositivo.',
  denied: 'No se concedió el permiso para recibir notificaciones push.',
  blocked:
    'Las notificaciones están bloqueadas en tu dispositivo. Actívalas desde los ajustes del navegador o del sistema para recibir avisos de TrabaGE.',
  securityAlwaysOn: 'Las alertas críticas de cuenta y seguridad permanecen siempre activas para proteger tu cuenta.',
};

export const NOTIFICATION_EMPTY_STATE_ICON = Sparkles;
