import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import { authService } from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';

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
      setError(mapAuthError(resetError));
    } else {
      setMessage('Revisa tu email para restablecer tu contraseña.');
    }
    setLoading(false);
  };

  return (
    <MobileScreenLayout
      header={
        <div className="px-space-base pt-space-sm">
          <h1 className="text-title text-app-text">Recuperar contraseña</h1>
          <p className="mt-space-xs text-body-small text-app-muted">Te enviaremos un enlace a tu correo</p>
        </div>
      }
      contentClassName="px-space-base pb-space-sm"
      footer={
        <div className="space-y-space-sm">
          {error ? <p className="text-body-small text-error-600">{error}</p> : null}
          {message ? <p className="text-body-small text-success-600">{message}</p> : null}
          <Button type="submit" form="forgot-password-form" fullWidth loading={loading} size="lg">
            Enviar enlace
          </Button>
          <Link to="/login" className="block text-center text-body-small text-primary-600">
            Volver al login
          </Link>
        </div>
      }
    >
      <form id="forgot-password-form" onSubmit={handleSubmit} className="mt-space-sm">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </form>
    </MobileScreenLayout>
  );
}
