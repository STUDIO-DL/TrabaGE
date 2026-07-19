import PageContainer from '../layout/PageContainer';
import NotificationPreferencesPanel from './NotificationPreferencesPanel';
import JobAlertPreferencesPanel from './JobAlertPreferencesPanel';
import { ROLES, isEmployerRole } from '../../constants/roles';

export default function NotificationSettingsScreen({ accountType = ROLES.PERSONAL }) {
  const isPersonal = !isEmployerRole(accountType);

  return (
    <PageContainer backButton className="bg-app-surface">
      <div className="bg-gradient-to-b from-app-card via-app-surface to-app-surface px-space-base pt-space-base theme-transition">
        <div className="mx-auto w-full max-w-lg space-y-space-base">
          <div className="surface-card p-space-base">
            <h1 className="text-heading-m text-app-text">Notificaciones</h1>
            <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">
              Elige qué avisos quieres recibir. Tus preferencias se guardan en TrabaGE y se sincronizan entre dispositivos.
            </p>
          </div>

          <NotificationPreferencesPanel accountType={accountType} />

          {isPersonal ? <JobAlertPreferencesPanel /> : null}
        </div>
      </div>
    </PageContainer>
  );
}
