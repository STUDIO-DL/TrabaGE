import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Button from '../../components/ui/Button';
import { ROLE_HOME, ROLE_SETUP, ROLES } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { isPreviewActive } from '../../constants/preview';
import { supabase } from '../../config/supabase';

export default function AccountTypeSelect() {
  const navigate = useNavigate();
  const { user, role, isPreviewMode, enterPreviewModeAsRole, refreshSetupStatus } = useAuth();
  const previewActive = isPreviewActive(isPreviewMode);

  useEffect(() => {
    if (previewActive || !role) return;
    if (role === ROLES.ADMIN) {
      navigate(ROLE_HOME[ROLES.ADMIN], { replace: true });
    }
  }, [previewActive, role, navigate]);

  const selectRole = async (role) => {
    if (previewActive) {
      enterPreviewModeAsRole(role);
      navigate(ROLE_HOME[role], { replace: true });
      return;
    }

    if (!user?.id) return;

    await supabase.from('user_roles').upsert({ user_id: user.id, role });
    await refreshSetupStatus();
    navigate(ROLE_SETUP[role], { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">¿Qué tipo de cuenta quieres?</h1>
      <p className="mt-2 text-sm text-gray-500">
        {previewActive
          ? 'Elige un rol para explorar la app en modo vista previa'
          : 'Elige cómo usarás TrabaGE'}
      </p>

      {previewActive && (
        <p className="mt-4 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800">
          Modo vista previa activo. Los datos no se guardarán en el servidor.
        </p>
      )}

      <div className="mt-8 space-y-4">
        <Button fullWidth onClick={() => selectRole(ROLES.CANDIDATE)}>
          Cuenta de Candidato
        </Button>
        <Button variant="secondary" fullWidth onClick={() => selectRole(ROLES.COMPANY)}>
          Cuenta de Empresa
        </Button>
      </div>
    </div>
  );
}
