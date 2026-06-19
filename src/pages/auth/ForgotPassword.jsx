import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
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
    <MobileScreenLayout
      header={
        <div className="px-md pt-sm">
          <h1 className="text-heading-m font-bold text-gray-900">Recuperar contraseña</h1>
          <p className="mt-xs text-small text-gray-500">Te enviaremos un enlace a tu correo</p>
        </div>
      }
      contentClassName="px-md pb-sm"
      footer={
        <div className="space-y-sm">
          {error ? <p className="text-small text-red-600">{error}</p> : null}
          {message ? <p className="text-small text-green-600">{message}</p> : null}
          <Button type="submit" form="forgot-password-form" fullWidth loading={loading} className="btn-primary-mobile !rounded-btn-primary !py-0">
            Enviar enlace
          </Button>
          <Link to="/login" className="block text-center text-small text-primary-600">
            Volver al login
          </Link>
        </div>
      }
      footerClassName="border-t border-gray-100 px-md pb-md pt-sm"
    >
      <form id="forgot-password-form" onSubmit={handleSubmit} className="mt-sm">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </form>
    </MobileScreenLayout>
  );
}
