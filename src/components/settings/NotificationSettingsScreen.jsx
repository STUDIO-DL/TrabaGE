import PageContainer from '../layout/PageContainer';
import NotificationPreferencesPanel from './NotificationPreferencesPanel';
import JobAlertPreferencesPanel from './JobAlertPreferencesPanel';
import { ROLES, isEmployerRole } from '../../constants/roles';

export default function NotificationSettingsScreen({ accountType = ROLES.PERSONAL }) {
  const isPersonal = !isEmployerRole(accountType);

  return (
    <PageContainer backButton className="bg-app-surface">
      <div className="min-h-dvh bg-gradient-to-b from-white via-slate-50 to-slate-50 px-5 pb-28 pt-5 theme-transition">
        <div className="mx-auto w-full max-w-lg space-y-5">
          <div className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.05)]">
            <h1 className="text-[24px] font-bold tracking-[-0.02em] text-slate-950">Notificaciones</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
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
