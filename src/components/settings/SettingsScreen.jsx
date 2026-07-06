import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppIcon from '../common/AppIcon';
import DeleteAccountModal from '../profile/modals/DeleteAccountModal';
import PageContainer from '../layout/PageContainer';
import {
  Bell,
  ChevronRight,
  FileText,
  Globe,
  Headphones,
  LogOut,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
  ICON_SIZES,
} from '../../constants/icons';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { ROLES } from '../../constants/roles';
import { SUPPORT_EMAIL } from '../../constants/support';
import { useNotificationContext } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function SectionCard({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  icon,
  title,
  onClick,
  to,
  danger = false,
  showChevron = true,
  subtitle,
}) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (to) {
      navigate(to);
      return;
    }
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex min-h-[58px] w-full items-center gap-4 px-5 py-3.5 text-left transition duration-200 hover:bg-primary-50/40 active:scale-[0.99] active:bg-primary-50 focus:outline-none focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-100"
    >
      <span
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
          danger ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600',
        ].join(' ')}
      >
        <AppIcon icon={icon} size={ICON_SIZES.default} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={[
            'block text-[15px] font-semibold',
            danger ? 'text-red-600' : 'text-slate-900',
          ].join(' ')}
        >
          {title}
        </span>
        {subtitle ? <span className="mt-0.5 block text-xs text-slate-400">{subtitle}</span> : null}
      </span>
      {showChevron ? (
        <AppIcon
          icon={ChevronRight}
          size={ICON_SIZES.sm}
          className={danger ? 'text-red-300' : 'text-slate-300 transition group-hover:text-primary-400'}
          strokeWidth={2}
        />
      ) : null}
    </button>
  );
}

function Divider() {
  return <div className="mx-5 h-px bg-slate-100" />;
}

function EmailSummaryCard({ email }) {
  return (
    <div className="rounded-[30px] border border-primary-100/70 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <AppIcon icon={Mail} size={ICON_SIZES.default} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-950">{email || 'Cuenta sin correo'}</p>
          <p className="mt-1 text-sm text-slate-400">Cuenta activa</p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsScreen({ accountType }) {
  const { user, logout, role, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const activeRole = accountType || role;
  const isCompany = activeRole === ROLES.COMPANY;
  const routes = useMemo(
    () => ({
      profile: isCompany ? '/company/profile' : '/candidate/profile',
      notifications: isCompany ? '/company/notifications' : '/candidate/notifications',
      notificationSettings: isCompany ? '/company/settings/notifications' : '/candidate/settings/notifications',
      help: isCompany ? '/company/help' : '/help',
      settings: isCompany ? '/company/settings' : '/candidate/settings',
      appearance: isCompany ? '/company/settings/appearance' : '/candidate/settings/appearance',
    }),
    [isCompany],
  );

  const showComingSoon = (label) => {
    showToast(`${label} estará disponible próximamente.`, 'info');
  };

  const handleSupport = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Soporte%20TrabaGE`;
  };

  const handleLogout = async () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }
    await logout();
    navigate('/login', { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      setDeleteOpen(false);
      return;
    }

    setDeleteLoading(true);
    const { error } = await authService.deleteAccount();
    setDeleteLoading(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo eliminar la cuenta.'), 'error');
      return;
    }

    showToast('Cuenta eliminada', 'success');
    setDeleteOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <PageContainer topBar={false} bottomNav className="bg-slate-50">
      <div className="min-h-dvh bg-gradient-to-b from-white via-slate-50 to-slate-50 pb-28 pt-safe">
        <div className="mx-auto w-full max-w-lg px-5 pt-6 sm:px-6">
          <header className="mb-7 text-center">
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-slate-950">Configuración</h1>
          </header>

          <div className="space-y-8">
            <EmailSummaryCard email={user?.email} />

            <SectionCard title="Cuenta">
              <SettingsRow icon={User} title="Gestionar perfil" to={routes.profile} />
              <Divider />
              <SettingsRow
                icon={ShieldCheck}
                title="Contraseña y seguridad"
                subtitle="Actualizar contraseña y acceso"
                onClick={() => navigate('/auth/set-password', { state: { redirectTo: routes.settings, requireCurrentPassword: true } })}
              />
              <Divider />
              <SettingsRow
                icon={Bell}
                title="Bandeja de notificaciones"
                subtitle="Ver avisos recibidos"
                to={routes.notifications}
              />
              <Divider />
              <SettingsRow
                icon={Bell}
                title="Notificaciones"
                subtitle="Push y categorías de avisos"
                to={routes.notificationSettings}
              />
            </SectionCard>

            <SectionCard title="Preferencias">
              <SettingsRow
                icon={SlidersHorizontal}
                title="Apariencia"
                subtitle="Modo claro u oscuro"
                to={routes.appearance}
              />
              <Divider />
              <SettingsRow
                icon={Globe}
                title="Acerca de TrabaGE"
                onClick={() => showComingSoon('Acerca de TrabaGE')}
              />
            </SectionCard>

            <SectionCard title="Legal">
              <SettingsRow icon={FileText} title="Política de privacidad" to={LEGAL_ROUTES.privacy} />
              <Divider />
              <SettingsRow icon={FileText} title="Términos de servicio" to={LEGAL_ROUTES.terms} />
            </SectionCard>

            <SectionCard title="Soporte">
              <SettingsRow icon={Headphones} title="Centro de ayuda" to={routes.help} />
              <Divider />
              <SettingsRow
                icon={Mail}
                title="Contactar con soporte"
                subtitle={SUPPORT_EMAIL}
                onClick={handleSupport}
              />
            </SectionCard>

            <SectionCard title="Cuenta">
              <SettingsRow icon={LogOut} title="Cerrar sesión" onClick={handleLogout} showChevron={false} />
              <Divider />
              <SettingsRow
                icon={Trash2}
                title="Eliminar cuenta"
                danger
                showChevron={false}
                onClick={() => setDeleteOpen(true)}
              />
            </SectionCard>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
        email={user?.email}
      />
    </PageContainer>
  );
}
