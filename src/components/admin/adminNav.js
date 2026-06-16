import {
  Bell,
  Briefcase,
  Building2,
  Flag,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Settings,
  ShieldCheck,
  Users,
} from '../../constants/icons';

export const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/companies', label: 'Empresas', icon: Building2 },
  { to: '/admin/verifications', label: 'Verificaciones', icon: ShieldCheck },
  { to: '/admin/jobs', label: 'Ofertas', icon: Briefcase },
  { to: '/admin/posts', label: 'Publicaciones', icon: Newspaper },
  { to: '/admin/reports', label: 'Reportes', icon: Flag },
  { to: '/admin/notifications', label: 'Notificaciones', icon: Bell },
  { to: '/admin/settings', label: 'Configuración', icon: Settings },
];

export const ADMIN_LOGOUT_ITEM = { label: 'Cerrar sesión', icon: LogOut };
