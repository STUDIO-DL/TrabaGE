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

export default function CompanyProfileTabs({ activeTab, onTabChange, hasServices = false }) {
  const tabs = getCompanyProfileTabs({ hasServices });

  return (
    <nav
      className="sticky top-14 z-20 border-b border-app-border bg-app-card/95 backdrop-blur"
      aria-label="Secciones del perfil"
    >
      <div className="flex overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative shrink-0 px-space-base py-space-md text-body-small font-medium transition-colors duration-fast ${
                isActive ? 'text-primary-700' : 'text-app-muted hover:text-app-text'
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
