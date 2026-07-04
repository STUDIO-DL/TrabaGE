import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
import { GoogleAuthButton } from '../../components/auth/SocialAuthButtons';
import { clearPreviewMode } from '../../constants/preview';
import { ROLE_LABELS, ROLES } from '../../constants/roles';
import { authService } from '../../services/auth.service';
import { mapAuthError } from '../../utils/errors';

export default function RegisterMethod() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedType = location.state?.accountType ?? searchParams.get('type');
  const accountType = [ROLES.CANDIDATE, ROLES.COMPANY].includes(requestedType) ? requestedType : null;
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accountType) {
      navigate('/account-type', { replace: true });
    }
  }, [accountType, navigate]);

  const goToEmail = () => {
    navigate(`/register?type=${accountType}`, { state: { accountType } });
  };

  const handleGoogle = async () => {
    setError('');
    clearPreviewMode();

    const { error: googleError } = await authService.signupWithGoogle(accountType);
    if (googleError) {
      setError(mapAuthError(googleError));
    }
  };

  if (!accountType) return null;

  return (
    <MobileScreenLayout
      header={
        <div className="px-md pt-sm">
          <button
            type="button"
            onClick={() => navigate('/account-type')}
            className="mb-sm text-small font-medium text-primary-600"
          >
            ← Volver
          </button>
          <h1 className="text-heading-m font-bold text-gray-900">¿Cómo quieres crear tu cuenta?</h1>
          <p className="mt-xs text-small text-gray-500">
            Cuenta de {(ROLE_LABELS[accountType] ?? 'usuario').toLowerCase()}
          </p>
        </div>
      }
      contentClassName="px-md pb-sm"
      footer={
        <div className="space-y-sm">
          {error ? <p className="text-small text-red-600">{error}</p> : null}
          <Button
            fullWidth
            onClick={goToEmail}
            className="btn-primary-mobile !rounded-btn-primary !py-0"
          >
            Continuar con correo
          </Button>
          <div className="relative py-xs">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-caption uppercase text-gray-400">
              <span className="bg-white px-sm">o</span>
            </div>
          </div>
          <GoogleAuthButton onClick={handleGoogle} />
          <p className="pt-xs text-center text-small text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-primary-600">
              Inicia sesión
            </Link>
          </p>
        </div>
      }
      footerClassName="border-t border-gray-100 px-md pb-md pt-sm"
    />
  );
}
