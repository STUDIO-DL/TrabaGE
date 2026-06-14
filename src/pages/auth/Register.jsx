import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Input label="Confirmar contraseña" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
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
