import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Menu, X, ICON_SIZES } from '../../constants/icons';
import AdminSidebar from './AdminSidebar';

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/users': 'Usuarios',
  '/admin/companies': 'Empresas',
  '/admin/organizations': 'Organizaciones',
  '/admin/verifications': 'Verificaciones',
  '/admin/jobs': 'Ofertas de trabajo',
  '/admin/posts': 'Publicaciones',
  '/admin/topics': 'Temas',
  '/admin/reports': 'Reportes',
  '/admin/notifications': 'Notificaciones',
  '/admin/profile': 'Perfil admin',
  '/admin/settings': 'Configuración',
};

function getPageTitle(pathname) {
  return PAGE_TITLES[pathname] ?? 'Administración';
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const title = getPageTitle(pathname);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-dvh bg-[#F8FAFC]">
      <div className="flex min-h-dvh w-full">
        <AdminSidebar className="hidden lg:flex" />

        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Cerrar menú"
              onClick={closeDrawer}
            />
            <AdminSidebar
              className="relative z-10 h-full shadow-xl"
              onNavigate={closeDrawer}
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-4 lg:px-8">
            <button
              type="button"
              className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
              aria-label={drawerOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              <AppIcon icon={drawerOpen ? X : Menu} size={ICON_SIZES.default} />
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
                Admin
              </p>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
