import { profileTabButtonClass, profileTabNavInnerClass } from './companyProfileStyles';

const BASE_TABS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'empleos', label: 'Empleos' },
  { id: 'publicaciones', label: 'Publicaciones' },
  { id: 'acerca', label: 'Acerca de' },
];

export function getCompanyProfileTabs({ hasServices = false } = {}) {
  const tabs = [...BASE_TABS];
  if (hasServices) {
    tabs.push({ id: 'servicios', label: 'Servicios' });
  }
  return tabs;
}

export default function CompanyProfileTabs({ activeTab, onTabChange, hasServices = false, stickyTop = 'profile-tabs-sticky' }) {
  const tabs = getCompanyProfileTabs({ hasServices });

  return (
    <nav
      className={`${stickyTop} border-b border-app-border bg-app-card shadow-[0_1px_0_rgba(0,0,0,0.04)] supports-[backdrop-filter]:bg-app-card/95 supports-[backdrop-filter]:backdrop-blur`}
      aria-label="Secciones del perfil"
    >
      <div className={profileTabNavInnerClass} role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`${profileTabButtonClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                isActive ? 'font-semibold text-primary-700' : 'text-app-muted hover:text-app-text'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-space-sm bottom-0 h-0.5 rounded-full bg-primary-600" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
