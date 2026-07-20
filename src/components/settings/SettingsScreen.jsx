import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppIcon from '../common/AppIcon';
import Skeleton from '../common/Skeleton';
import AppAvatar from '../common/AppAvatar';
import { avatarTypeFromRole } from '../../constants/avatarDefaults';
import DeleteAccountModal from '../profile/modals/DeleteAccountModal';
import LogoutConfirmModal from '../profile/modals/LogoutConfirmModal';
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
import { useProfile } from '../../hooks/useProfile';
import { getCompanyDisplayName } from '../../utils/companyProfile';
import { getDisplayName } from '../../utils/displayIdentity';
import { authService } from '../../services/auth.service';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

const SETTINGS_AVATAR_SIZE_CLASS = 'h-[7.5rem] w-[7.5rem]'; // matches AppAvatar size="2xl"

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
      className="group flex min-h-touch w-full items-center gap-space-md px-space-base py-space-sm text-left transition-colors duration-fast ease-out hover:bg-primary-50/40 active:scale-[0.99] active:bg-primary-50 focus:outline-none focus-visible:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-100"
    >
      <span
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-md',
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

function AccountSummaryCard({ email, profile, loading, isCompany, accountType, user, role }) {
  const displayName = isCompany
    ? getCompanyDisplayName(profile, { user, role, warnIfMissing: true })
    : getDisplayName(profile, role, { user, context: 'settings', warnIfMissing: true });

  if (loading) {
    return (
      <div
        className="overflow-hidden rounded-radius-xl border border-primary-100/70 bg-app-card shadow-elevation-2"
        aria-busy="true"
        aria-label="Cargando perfil"
      >
        <div className="flex flex-col items-center px-space-base pb-space-lg pt-space-lg text-center">
          <Skeleton className={`${SETTINGS_AVATAR_SIZE_CLASS} shrink-0 rounded-radius-circular`} />
          <Skeleton className="mt-space-base h-6 w-44 max-w-full" />
          <Skeleton className="mt-space-sm h-3.5 w-48 max-w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-radius-xl border border-primary-100/70 bg-app-card shadow-elevation-2">
      <div className="flex flex-col items-center px-space-base pb-space-lg pt-space-lg text-center">
        <AppAvatar
          type={accountType}
          src={isCompany ? profile?.logo_path : profile?.avatar_path}
          name={displayName}
          alt={displayName}
          size="2xl"
          variant={isCompany ? 'rounded' : 'circular'}
          className="border-2 border-app-border shadow-elevation-2"
        />
        <h2 className="mt-space-base max-w-full truncate text-title font-bold tracking-tight text-app-text">
          {displayName}
        </h2>
        <p className="mt-space-sm max-w-full truncate text-caption text-app-subtle">
          {email || 'Cuenta sin correo'}
        </p>
      </div>
    </div>
  );
}

export default function SettingsScreen({ accountType }) {
  const { user, logout, role, isPreviewMode } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { showToast } = useNotificationContext();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const activeRole = accountType || role;
  const isCompany = isEmployerRole(activeRole);
  const avatarType = avatarTypeFromRole(activeRole, { profile });
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

  const openLogoutConfirm = () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }
    setLogoutOpen(true);
  };

  const confirmLogout = async () => {
    setLogoutLoading(true);
    await logout();
    setLogoutLoading(false);
    setLogoutOpen(false);
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

    showToast('Cuenta eliminada.', 'success');
    setDeleteOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <PageContainer topBar={false} bottomNav className="bg-app-surface">
      <div className="bg-gradient-to-b from-app-card via-app-surface to-app-surface pt-safe">
        <div className="mx-auto w-full max-w-lg px-space-base pt-space-lg sm:px-space-lg">
          <div className="space-y-space-xl">
            <AccountSummaryCard
              email={user?.email}
              profile={profile}
              loading={profileLoading}
              isCompany={isCompany}
              accountType={avatarType}
              user={user}
              role={role}
            />

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
              <SettingsRow icon={FileText} title="Términos y Condiciones" to={LEGAL_ROUTES.terms} />
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

            <SectionCard title="Sesión">
              <SettingsRow icon={LogOut} title="Cerrar sesión" onClick={openLogoutConfirm} showChevron={false} />
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

      <LogoutConfirmModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
        loading={logoutLoading}
      />

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
