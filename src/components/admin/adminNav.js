import {
  Bell,
  Briefcase,
  Building2,
  Flag,
  Landmark,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Settings,
  ShieldCheck,
  Tags,
  User,
  Users,
} from '../../constants/icons';

export const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/companies', label: 'Empresas', icon: Building2 },
  { to: '/admin/organizations', label: 'Organizaciones', icon: Landmark },
  { to: '/admin/verifications', label: 'Verificaciones', icon: ShieldCheck },
  { to: '/admin/jobs', label: 'Ofertas', icon: Briefcase },
  { to: '/admin/posts', label: 'Publicaciones', icon: Newspaper },
  { to: '/admin/topics', label: 'Temas', icon: Tags },
  { to: '/admin/reports', label: 'Reportes', icon: Flag },
  { to: '/admin/notifications', label: 'Notificaciones', icon: Bell },
  { to: '/admin/profile', label: 'Perfil admin', icon: User },
  { to: '/admin/settings', label: 'Configuración', icon: Settings },
];

export const ADMIN_LOGOUT_ITEM = { label: 'Cerrar sesión', icon: LogOut };
