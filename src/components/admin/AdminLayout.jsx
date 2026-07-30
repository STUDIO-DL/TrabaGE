import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Menu, X, ICON_SIZES } from '../../constants/icons';
import AdminSidebar from './AdminSidebar';

const PAGE_TITLES = {
  '/admin': 'Resumen',
  '/admin/analytics': 'Analítica',
  '/admin/users': 'Usuarios',
  '/admin/companies': 'Empresas',
  '/admin/organizations': 'Organizaciones',
  '/admin/verifications': 'Verificaciones',
  '/admin/jobs': 'Ofertas',
  '/admin/posts': 'Publicaciones',
  '/admin/topics': 'Temas',
  '/admin/reports': 'Reportes',
  '/admin/notifications': 'Notificaciones',
  '/admin/profile': 'Perfil',
  '/admin/settings': 'Configuración',
};

function getPageTitle(pathname) {
  if (pathname.startsWith('/admin/analytics')) return PAGE_TITLES['/admin/analytics'];
  return PAGE_TITLES[pathname] ?? 'Administración';
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const title = getPageTitle(pathname);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-dvh min-w-0 max-w-full overflow-x-hidden bg-app-surface">
      <div className="flex min-h-dvh w-full min-w-0">
        <AdminSidebar className="hidden lg:flex" />

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-app-text/40 transition-opacity duration-fast"
              aria-label="Cerrar menú"
              onClick={closeDrawer}
            />
            <AdminSidebar
              className="relative z-10 h-full border-r border-app-border bg-app-card"
              onNavigate={closeDrawer}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-20 flex items-center gap-space-md border-b border-app-border bg-app-elevated/95 px-space-md py-space-md backdrop-blur md:px-space-lg lg:px-space-xl">
            <button
              type="button"
              className="rounded-radius-md p-space-sm text-app-muted transition-colors hover:bg-app-surface hover:text-app-text lg:hidden"
              aria-label={drawerOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              <AppIcon icon={drawerOpen ? X : Menu} size={ICON_SIZES.default} />
            </button>
            <div className="min-w-0">
              <p className="text-caption font-medium text-primary-600">Admin</p>
              <h1 className="truncate text-title font-semibold tracking-tight text-app-text">{title}</h1>
            </div>
          </header>

          <main className="motion-page min-w-0 flex-1 px-space-md py-space-lg md:px-space-lg lg:px-space-xl lg:py-space-xl">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
