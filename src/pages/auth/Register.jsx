import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import { LegalAcceptanceText } from '../../components/legal/LegalLinks';
import { clearPreviewMode } from '../../constants/preview';
import { ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { register, enterPreviewMode } = useAuth();
  const requestedType = location.state?.accountType ?? searchParams.get('type');
  const accountType = [ROLES.CANDIDATE, ROLES.COMPANY].includes(requestedType) ? requestedType : null;
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!accountType) {
      navigate('/account-type', { replace: true });
    }
  }, [accountType, navigate]);

  const handlePreview = () => {
    enterPreviewMode();
    navigate('/account-type', { replace: true });
  };

  const handleGoogleRegister = async () => {
    setError('');
    clearPreviewMode();

    const { error: googleError } = await authService.signupWithGoogle(accountType);
    if (googleError) {
      setError(mapAuthError(googleError));
    }
  };

  const goToPasswordStep = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Introduce tu correo electrónico.');
      return;
    }
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: registerError, redirectTo } = await register(email, password, accountType);
    if (registerError) {
      setError(mapAuthError(registerError));
      setLoading(false);
      return;
    }

    if (redirectTo) {
      setLoading(false);
      navigate(redirectTo, { replace: true });
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (!accountType) return null;

  if (success) {
    return (
      <MobileScreenLayout
        contentClassName="items-center justify-center px-md text-center"
        footer={(
          <div className="px-md pb-md">
            <Link to="/login" className="btn-primary-mobile bg-primary-600 text-center text-white no-underline">
              He verificado mi correo
            </Link>
          </div>
        )}
      >
        <h1 className="text-heading-m font-bold text-gray-900">Hemos enviado un enlace de verificación a tu correo electrónico.</h1>
        <p className="mt-sm text-small text-gray-500">
          Verifica tu correo para activar tu cuenta y acceder a TrabaGE.
        </p>
      </MobileScreenLayout>
    );
  }

  if (step === 0) {
    return (
      <MobileScreenLayout
        header={
          <div className="px-md pt-sm">
            <h1 className="text-heading-m font-bold text-gray-900">Crear cuenta</h1>
            <p className="mt-xs text-small text-gray-500">Regístrate o explora la app en vista previa</p>
          </div>
        }
        contentClassName="px-md pb-sm"
        footer={
          <div className="space-y-sm">
            <LegalAcceptanceText className="pb-1" />
            {error ? <p className="text-small text-red-600">{error}</p> : null}
            <Button type="submit" form="register-email-form" fullWidth className="btn-primary-mobile !rounded-btn-primary !py-0">
              Continuar
            </Button>
            <div className="relative py-xs">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-caption uppercase text-gray-400">
                <span className="bg-white px-sm">o</span>
              </div>
            </div>
            <GoogleAuthButton onClick={handleGoogleRegister} />
            <Button variant="secondary" fullWidth onClick={handlePreview} className="btn-secondary-mobile !rounded-btn-secondary !py-0">
              Explorar sin cuenta
            </Button>
            <p className="pt-xs text-center text-small text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium text-primary-600">
                Inicia sesión
              </Link>
            </p>
          </div>
        }
        footerClassName="border-t border-gray-100 px-md pb-md pt-sm"
      >
        <form id="register-email-form" onSubmit={goToPasswordStep} className="mt-sm">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </form>
      </MobileScreenLayout>
    );
  }

  return (
    <MobileScreenLayout
      header={
        <div className="px-md pt-sm">
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setError('');
            }}
            className="mb-sm text-small font-medium text-primary-600"
          >
            ← Volver
          </button>
          <h1 className="text-heading-m font-bold text-gray-900">Elige tu contraseña</h1>
          <p className="mt-xs text-small text-gray-500">{email}</p>
        </div>
      }
      contentClassName="px-md pb-sm"
      footer={
        <div className="space-y-sm">
          <LegalAcceptanceText className="pb-1" />
          {error ? <p className="text-small text-red-600">{error}</p> : null}
          <Button type="submit" form="register-password-form" fullWidth loading={loading} className="btn-primary-mobile !rounded-btn-primary !py-0">
            Crear cuenta
          </Button>
          <p className="text-center text-small text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-primary-600">
              Inicia sesión
            </Link>
          </p>
        </div>
      }
      footerClassName="border-t border-gray-100 px-md pb-md pt-sm"
    >
      <form id="register-password-form" onSubmit={handleSubmit} className="mt-sm space-y-sm">
        <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Input
          label="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </form>
    </MobileScreenLayout>
  );
}
