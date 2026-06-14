import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';

export default function Login() {
  const navigate = useNavigate();
  const { login, getHomePath } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-gray-500">Bienvenido de nuevo a TrabaGE</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Entrar
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        <Button variant="secondary" fullWidth onClick={() => authService.loginWithGoogle()}>
          Continuar con Google
        </Button>
        <Button variant="secondary" fullWidth onClick={() => authService.loginWithApple()}>
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
