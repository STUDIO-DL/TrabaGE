import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';
import { validateStrongPassword } from '../../utils/passwordValidation';

export default function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isPreviewMode, getHomePath, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.redirectTo || getHomePath() || '/';
  const requiresCurrentPassword = location.state?.passwordRecovery !== true;

  if (!isAuthenticated || isPreviewMode) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (requiresCurrentPassword && !currentPassword.trim()) {
      setError('Introduce tu contraseña actual.');
      return;
    }

    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    if (currentPassword && currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente de la contraseña actual.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (requiresCurrentPassword && !user?.email) {
      setError('No se pudo verificar el correo de tu cuenta. Vuelve a iniciar sesión.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: passwordError } = requiresCurrentPassword
      ? await authService.changePasswordWithCurrent(user.email, currentPassword, newPassword)
      : await authService.setPassword(newPassword);
    if (passwordError) {
      setError(mapAuthError(passwordError) || 'No se pudo guardar la contraseña.');
      setLoading(false);
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <MobileScreenLayout
      header={
        <div className="px-md pt-sm">
          <div className="mb-sm flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-heading-m font-bold text-gray-900">Actualizar contraseña</h1>
          <p className="mt-xs text-small text-gray-500">
            {requiresCurrentPassword
              ? 'Introduce tu contraseña actual y elige una nueva contraseña segura.'
              : 'Define una contraseña segura para proteger tu cuenta de TrabaGE.'}
          </p>
        </div>
      }
      contentClassName="px-md pb-sm"
      footer={
        <div className="space-y-sm">
          {error ? <p className="text-small text-red-600">{error}</p> : null}
          <Button
            type="submit"
            form="set-password-form"
            fullWidth
            loading={loading}
            className="btn-primary-mobile !rounded-btn-primary !py-0"
          >
            Guardar contraseña
          </Button>
        </div>
      }
      footerClassName="border-t border-gray-100 px-md pb-md pt-sm"
    >
      <form id="set-password-form" onSubmit={handleSubmit} className="mt-sm space-y-sm">
        {requiresCurrentPassword ? (
          <Input
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        ) : null}
        <Input
          label="Contraseña nueva"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-gray-500">
          Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo.
        </p>
        <Input
          label="Confirmar contraseña nueva"
          type="password"
          value={confirmNewPassword}
          onChange={(event) => setConfirmNewPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </form>
    </MobileScreenLayout>
  );
}
