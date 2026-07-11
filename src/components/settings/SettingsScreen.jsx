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
  Info,
  LogOut,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
  ICON_SIZES,
} from '../../constants/icons';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';
import { ROLES, isEmployerRole, rolePath } from '../../constants/roles';
import { SUPPORT_EMAIL } from '../../constants/support';
import { APP_VERSION } from '../../constants/zarrel';
import { useNotificationContext } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function SectionCard({ title, children }) {
  return (
    <section className="space-y-space-md">
      <h2 className="px-space-xs text-label font-semibold uppercase tracking-[0.16em] text-app-subtle">
        {title}
      </h2>
      <div className="overflow-hidden rounded-radius-xl border border-app-border bg-app-card shadow-elevation-2">
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
      className="group flex min-h-[58px] w-full items-center gap-space-base px-space-lg py-space-md text-left transition-colors duration-fast ease-out hover:bg-primary-50/40 active:scale-[0.99] active:bg-primary-50 focus:outline-none focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-100"
    >
      <span
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-lg',
          danger ? 'bg-error-50 text-error-600' : 'bg-primary-50 text-primary-600',
        ].join(' ')}
      >
        <AppIcon icon={icon} size={ICON_SIZES.md} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={[
            'block text-button font-semibold',
            danger ? 'text-error-600' : 'text-app-text',
          ].join(' ')}
        >
          {title}
        </span>
        {subtitle ? <span className="mt-0.5 block text-caption text-app-subtle">{subtitle}</span> : null}
      </span>
      {showChevron ? (
        <AppIcon
          icon={ChevronRight}
          size={ICON_SIZES.sm}
          className={danger ? 'text-error-300' : 'text-app-subtle transition-colors duration-fast group-hover:text-primary-400'}
          strokeWidth={2}
        />
      ) : null}
    </button>
  );
}

function Divider() {
  return <div className="mx-space-lg h-px bg-app-divider" />;
}

function EmailSummaryCard({ email }) {
  return (
    <div className="rounded-radius-xl border border-primary-100/70 bg-app-card px-space-lg py-space-lg shadow-elevation-2">
      <div className="flex items-center gap-space-base">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-radius-circular bg-primary-50 text-primary-600">
          <AppIcon icon={Mail} size={ICON_SIZES.md} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-button font-semibold text-app-text">{email || 'Cuenta sin correo'}</p>
          <p className="mt-space-xs text-body-small text-app-subtle">Cuenta activa</p>
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
  const isCompany = isEmployerRole(activeRole);
  const routes = useMemo(() => {
    const base = isCompany ? activeRole || ROLES.BUSINESS : ROLES.PERSONAL;
    return {
      profile: rolePath(base, '/profile'),
      notifications: rolePath(base, '/notifications'),
      notificationSettings: rolePath(base, '/settings/notifications'),
      help: isCompany ? rolePath(base, '/help') : '/help',
      settings: rolePath(base, '/settings'),
      appearance: rolePath(base, '/settings/appearance'),
    };
  }, [activeRole, isCompany]);

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
    <PageContainer topBar={false} bottomNav className="bg-app-surface">
      <div className="min-h-dvh bg-gradient-to-b from-app-card via-app-surface to-app-surface pb-28 pt-safe">
        <div className="mx-auto w-full max-w-lg px-space-lg pt-space-xl sm:px-space-xl">
          <header className="mb-space-2xl text-center">
            <h1 className="text-title font-bold tracking-tight text-app-text">Configuración</h1>
          </header>

          <div className="space-y-space-2xl">
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
                to="/about"
              />
              <Divider />
              <SettingsRow
                icon={Info}
                title="Información de la app"
                subtitle={`Versión ${APP_VERSION}`}
                to="/app-info"
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
