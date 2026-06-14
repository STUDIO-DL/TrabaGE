import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { ROLES, ROLE_SETUP } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';

export default function AccountTypeSelect() {
  const navigate = useNavigate();
  const { user, refreshSetupStatus } = useAuth();

  const selectRole = async (role) => {
    if (!user?.id) return;

    await supabase.from('user_roles').upsert({ user_id: user.id, role });
    await refreshSetupStatus();
    navigate(ROLE_SETUP[role], { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">¿Qué tipo de cuenta quieres?</h1>
      <p className="mt-2 text-sm text-gray-500">Elige cómo usarás TrabaGE</p>

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
