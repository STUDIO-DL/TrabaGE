import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';

export default function Login() {
  const navigate = useNavigate();
  const { login, enterPreviewMode, enterPreviewModeAsRole, getHomePath } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePreview = () => {
    enterPreviewMode();
    navigate('/account-type', { replace: true });
  };

  const handleCompanyPreview = () => {
    enterPreviewModeAsRole(ROLES.COMPANY);
    navigate('/company/feed', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: loginError } = await login(email, password);
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    navigate(getHomePath(), { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Bienvenido a TrabaGE</h1>
      <p className="mt-2 text-sm text-gray-500">Explora la app o inicia sesión con tu cuenta</p>

      <Button className="mt-8" fullWidth onClick={handleCompanyPreview}>
        Preview cuenta empresa
      </Button>
      <p className="mt-2 text-center text-xs text-gray-400">
        Vista previa directa · sin registro
      </p>

      <Button className="mt-4" variant="secondary" fullWidth onClick={handlePreview}>
        Explorar sin cuenta
      </Button>
      <p className="mt-2 text-center text-xs text-gray-400">
        Elige candidato o empresa
      </p>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-400">o inicia sesión</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="secondary" fullWidth loading={loading}>
          Entrar
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        <Button variant="ghost" fullWidth onClick={() => authService.loginWithGoogle()}>
          Continuar con Google
        </Button>
        <Button variant="ghost" fullWidth onClick={() => authService.loginWithApple()}>
          Continuar con Apple
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/forgot-password" className="text-primary-600">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-gray-500">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-primary-600">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
