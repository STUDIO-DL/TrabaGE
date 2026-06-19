import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Button from '../../components/ui/Button';
import MobileScreenLayout from '../../components/layout/MobileScreenLayout';
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

  const selectRole = async (selectedRole) => {
    if (previewActive) {
      enterPreviewModeAsRole(selectedRole);
      navigate(ROLE_HOME[selectedRole], { replace: true });
      return;
    }

    if (!user?.id) return;

    await supabase.from('user_roles').upsert({ user_id: user.id, role: selectedRole });
    await refreshSetupStatus();
    navigate(ROLE_SETUP[selectedRole], { replace: true });
  };

  return (
    <MobileScreenLayout
      header={
        <div className="px-md pt-sm">
          <h1 className="text-heading-m font-bold text-gray-900">¿Qué tipo de cuenta quieres?</h1>
          <p className="mt-xs text-small text-gray-500">
            {previewActive
              ? 'Elige un rol para explorar la app en modo vista previa'
              : 'Elige cómo usarás TrabaGE'}
          </p>
        </div>
      }
      contentClassName="px-md pb-sm"
      footer={
        <div className="space-y-sm">
          {previewActive ? (
            <p className="rounded-btn-secondary bg-primary-50 px-md py-sm text-small text-primary-800">
              Modo vista previa activo. Los datos no se guardarán en el servidor.
            </p>
          ) : null}
          <Button fullWidth onClick={() => selectRole(ROLES.CANDIDATE)} className="btn-primary-mobile !rounded-btn-primary !py-0">
            Cuenta de Candidato
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => selectRole(ROLES.COMPANY)}
            className="btn-secondary-mobile !rounded-btn-secondary !py-0"
          >
            Cuenta de empresa / institución
          </Button>
        </div>
      }
      footerClassName="border-t border-gray-100 px-md pb-md pt-sm"
    />
  );
}
