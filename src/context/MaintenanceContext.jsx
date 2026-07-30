import { createContext, useContext } from 'react';
import { useMaintenanceMode } from '../hooks/useMaintenanceMode';

const MaintenanceContext = createContext(null);

export function MaintenanceProvider({ children }) {
  const value = useMaintenanceMode();
  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) {
    throw new Error('useMaintenance must be used within MaintenanceProvider');
  }
  return ctx;
}
