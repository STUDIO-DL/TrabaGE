import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/auth.service';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error: resetError } = await authService.resetPassword(email.trim().toLowerCase());
    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Revisa tu email para restablecer tu contraseña.');
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Enviar enlace
        </Button>
      </form>
      <Link to="/login" className="mt-6 text-center text-sm text-primary-600">
        Volver al login
      </Link>
    </div>
  );
}
