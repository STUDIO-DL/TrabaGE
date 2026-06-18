import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import { clearPreviewMode } from '../../constants/preview';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';

export default function Register() {
  const navigate = useNavigate();
  const { register, enterPreviewMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePreview = () => {
    enterPreviewMode();
    navigate('/account-type', { replace: true });
  };

  const handleGoogleRegister = async () => {
    setError('');
    clearPreviewMode();

    const { error: googleError } = await authService.loginWithGoogle(ROLES.CANDIDATE);
    if (googleError) {
      setError(googleError.message || 'No se pudo registrarse con Google');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: registerError } = await register(email, password, 'candidate');
    if (registerError) {
      setError(registerError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Revisa tu email</h1>
        <p className="mt-3 text-sm text-gray-500">
          Te enviamos un enlace de confirmación. Luego elige tu tipo de cuenta.
        </p>
        <Link to="/account-type" className="mt-6 text-primary-600">
          Continuar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
      <p className="mt-2 text-sm text-gray-500">Regístrate o explora la app en vista previa</p>

      <Button className="mt-8" variant="secondary" fullWidth onClick={handlePreview}>
        Explorar sin cuenta
      </Button>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-400">o regístrate</span>
        </div>
      </div>

      <GoogleAuthButton onClick={handleGoogleRegister} />

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-400">con email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input
          label="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Registrarse
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-primary-600">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
