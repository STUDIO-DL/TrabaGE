import {
  Bell,
  Briefcase,
  Building2,
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
  ],
  activity_post_interactions: ['new_post', 'company_update'],
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

export function getNotificationGroupsForRole(role) {
  return isEmployerRole(role) ? COMPANY_NOTIFICATION_GROUPS : CANDIDATE_NOTIFICATION_GROUPS;
}

export const NOTIFICATION_MASTER_CARD = {
  icon: Bell,
  title: 'Recibir notificaciones',
  description: 'Permite que TrabaGE te envíe notificaciones importantes en este dispositivo.',
};

export const NOTIFICATION_SAVED_COPY = {
  saved: 'Guardado',
  saving: 'Guardando...',
  activated: 'Las notificaciones han sido activadas.',
  denied: 'No se concedió el permiso para recibir notificaciones.',
  blocked:
    'Las notificaciones están bloqueadas en tu dispositivo. Actívalas desde los ajustes del navegador o del sistema para recibir avisos de TrabaGE.',
  securityAlwaysOn: 'Las alertas críticas de cuenta y seguridad permanecen siempre activas para proteger tu cuenta.',
};

export const NOTIFICATION_EMPTY_STATE_ICON = Sparkles;
