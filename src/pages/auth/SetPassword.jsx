import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';

export default function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isPreviewMode, getHomePath } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.redirectTo || getHomePath();

  if (!isAuthenticated || isPreviewMode) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: passwordError } = await authService.setPassword(password);
    if (passwordError) {
      setError(passwordError.message || 'No se pudo guardar la contrasena.');
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
          <h1 className="text-heading-m font-bold text-gray-900">Crea tu contrasena</h1>
          <p className="mt-xs text-small text-gray-500">
            Para completar el registro con Google, crea una contrasena para tu cuenta de TrabaGE.
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
            Guardar contrasena
          </Button>
        </div>
      }
      footerClassName="border-t border-gray-100 px-md pb-md pt-sm"
    >
      <form id="set-password-form" onSubmit={handleSubmit} className="mt-sm space-y-sm">
        <Input
          label="Contrasena"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Input
          label="Confirmar contrasena"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </form>
    </MobileScreenLayout>
  );
}
