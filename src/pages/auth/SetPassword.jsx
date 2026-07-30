import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

import Button from '../../components/ui/Button';
import PasswordInput from '../../components/ui/PasswordInput';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { formatAuthErrorDetail, mapAuthError } from '../../utils/errors';
import { getErrorMessage, t } from '../../utils/i18n';
import { validateStrongPassword } from '../../utils/passwordValidation';
import { isSafeInternalPath } from '../../utils/safeNavigation';
import { reportError } from '../../utils/logger';

export default function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isPreviewMode, getHomePath, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const rawRedirect = location.state?.redirectTo || getHomePath() || '/';
  const redirectTo = isSafeInternalPath(rawRedirect) ? rawRedirect : getHomePath() || '/';
  const requiresCurrentPassword = location.state?.passwordRecovery !== true;

  if (!isAuthenticated || isPreviewMode) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLockRef.current || loading) return;

    if (requiresCurrentPassword && !currentPassword) {
      setError(getErrorMessage('enterCurrentPassword'));
      return;
    }

    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    if (requiresCurrentPassword && currentPassword === newPassword) {
      setError(getErrorMessage('passwordMustDiffer'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError(getErrorMessage('passwordsMismatch'));
      return;
    }

    if (requiresCurrentPassword && !user?.email) {
      setError(getErrorMessage('cannotVerifyEmail'));
      return;
    }

    submitLockRef.current = true;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: passwordError } = requiresCurrentPassword
        ? await authService.changePasswordWithCurrent(user.email, currentPassword, newPassword)
        : await authService.setPassword(newPassword);

      if (passwordError) {
        reportError(passwordError, {
          area: 'set_password',
          detail: formatAuthErrorDetail(passwordError),
          recovery: !requiresCurrentPassword,
        });
        setError(mapAuthError(passwordError) || getErrorMessage('passwordSaveFailed'));
        return;
      }

      setSuccess(getErrorMessage('passwordUpdated'));
      window.setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 900);
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <MobileScreenLayout
      header={
        <div className="px-md pt-sm">
          <div className="mb-sm flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-title font-semibold tracking-tight text-app-text">Actualizar contraseña</h1>
          <p className="mt-space-xs text-body-small text-app-muted">
            {requiresCurrentPassword
              ? 'Introduce tu contraseña actual y elige una nueva contraseña segura.'
              : 'Define una contraseña segura para proteger tu cuenta de TrabaGE.'}
          </p>
        </div>
      }
      contentClassName="px-md pb-sm"
      footer={
        <div className="space-y-sm">
          {error ? (
            <p role="alert" className="text-small text-red-600">
              {error}
            </p>
          ) : null}
          {success ? (
            <p role="status" className="text-small text-green-700">
              {success}
            </p>
          ) : null}
          <Button
            type="submit"
            form="set-password-form"
            fullWidth
            loading={loading}
            disabled={loading || Boolean(success)}
            className="btn-primary-mobile !rounded-btn-primary !py-0"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </div>
      }
      footerClassName="border-t border-app-divider px-md pb-md pt-sm"
    >
      <form id="set-password-form" onSubmit={handleSubmit} className="mt-sm space-y-sm">
        {requiresCurrentPassword ? (
          <PasswordInput
            id="current-password"
            label="Contraseña actual"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        ) : null}
        <PasswordInput
          id="new-password"
          label="Contraseña nueva"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-caption text-app-muted">{t('auth.passwordHint')}</p>
        <PasswordInput
          id="confirm-new-password"
          label="Confirmar contraseña nueva"
          value={confirmNewPassword}
          onChange={(event) => setConfirmNewPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </form>
    </MobileScreenLayout>
  );
}
